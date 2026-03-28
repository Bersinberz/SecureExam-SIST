import { Response } from "express";
import { Student } from "../models/studentModel";
import { ExamModel } from "../models/ExamModel";
import { ExamSession } from "../models/ExamSession";
import { getUserIdFromToken } from "../utils/tokenUtils";
import Submission from "../models/Submission";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/jwtMiddleware";

// ------------------ GET EXAM DATA ------------------
// Called when student enters the exam page.
// Creates (or returns existing) a timed session.
export const getExamData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    if (!Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: "Invalid user token." });
      return;
    }

    const student = await Student.findById(userId).lean();
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    if (!student.department || !student.section || !student.year) {
      res.status(400).json({ success: false, message: "Student profile incomplete." });
      return;
    }

    const exams = await ExamModel.find({
      department: student.department,
      section:    student.section,
      year:       student.year,
    }).lean();

    if (!exams.length) {
      res.status(404).json({
        success: false,
        message: `No exams available for ${student.department} - ${student.section} - Year ${student.year}.`,
      });
      return;
    }

    const currentExam = exams[0];

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      registerNumber: student.registerNumber.toString(),
      examId:         currentExam._id.toString(),
    });

    // Create or retrieve exam session (server-side timer)
    let session = await ExamSession.findOne({ studentId: userId, examId: currentExam._id.toString() });

    if (!session) {
      const examTimeMs = Number(currentExam.examTime) * 60 * 1000;
      session = await ExamSession.create({
        studentId:      userId,
        registerNumber: student.registerNumber.toString(),
        examId:         currentExam._id.toString(),
        startedAt:      new Date(),
        expiresAt:      new Date(Date.now() + examTimeMs),
        submitted:      !!existingSubmission,
      });
    }

    const timeRemainingMs = Math.max(0, session.expiresAt.getTime() - Date.now());

    res.status(200).json({
      success: true,
      message: "Exam data fetched successfully",
      data: {
        exam: {
          id:         currentExam._id,
          name:       currentExam.examName,
          time:       currentExam.examTime,
          department: currentExam.department,
          section:    currentExam.section,
          year:       currentExam.year,
        },
        student: {
          registerNumber: student.registerNumber,
          userName:       student.userName,
          department:     student.department,
          section:        student.section,
          year:           student.year,
        },
        assignedQuestion: student.assignedQuestion || "No question assigned",
        hasSubmitted:     !!existingSubmission,
        timeRemainingMs,          // client uses this as the authoritative timer
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("getExamData error:", error);
    res.status(500).json({ success: false, message: "Error fetching exam data." });
  }
};

// ------------------ SUBMIT CODE ------------------
export const submitCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { language, code, assignedQuestion } = req.body;

    if (!language || !code || !assignedQuestion) {
      res.status(400).json({ success: false, message: "Language, code, and assigned question are required." });
      return;
    }

    const validLanguages = ["javascript", "python", "java", "c", "cpp"];
    if (!validLanguages.includes(language.toLowerCase())) {
      res.status(400).json({ success: false, message: "Invalid programming language." });
      return;
    }

    if (code.trim().length < 10 || code.length > 50_000) {
      res.status(400).json({ success: false, message: "Code must be between 10 and 50,000 characters." });
      return;
    }

    const userId = req.user!.userId;

    if (!Types.ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: "Invalid user token." });
      return;
    }

    const student = await Student.findById(userId).lean();
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    if (!student.department || !student.section || !student.year) {
      res.status(400).json({ success: false, message: "Student profile incomplete." });
      return;
    }

    const exams = await ExamModel.find({
      department: student.department,
      section:    student.section,
      year:       student.year,
    }).lean();

    if (!exams.length) {
      res.status(404).json({ success: false, message: "No active exam found." });
      return;
    }

    const exam = exams[0];

    // ── Server-side time enforcement ──────────────────────────────────────
    const session = await ExamSession.findOne({
      studentId: userId,
      examId:    exam._id.toString(),
    });

    if (!session) {
      res.status(403).json({ success: false, message: "No active exam session found. Please reload the exam page." });
      return;
    }

    if (new Date() > session.expiresAt) {
      res.status(403).json({ success: false, message: "Exam time has expired. Submission not accepted." });
      return;
    }

    if (session.submitted) {
      res.status(400).json({ success: false, message: "You have already submitted this exam." });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    // Prevent duplicate submission at DB level too
    const existingSubmission = await Submission.findOne({
      registerNumber: student.registerNumber.toString(),
      examId:         exam._id.toString(),
    });

    if (existingSubmission) {
      res.status(400).json({ success: false, message: "You have already submitted this exam." });
      return;
    }

    if (student.assignedQuestion && student.assignedQuestion !== assignedQuestion) {
      res.status(400).json({ success: false, message: "Submitted question does not match your assigned question." });
      return;
    }

    const submission = new Submission({
      registerNumber:   student.registerNumber.toString(),
      userName:         student.userName,
      department:       student.department,
      section:          student.section,
      year:             student.year.toString(),
      assignedQuestion,
      code,
      language:         language.toLowerCase(),
      examId:           exam._id.toString(),
      status:           "submitted" as const,
      submittedAt:      new Date(),
    });

    await submission.save();

    // Mark session as submitted
    await ExamSession.updateOne({ _id: session._id }, { $set: { submitted: true } });

    res.status(200).json({
      success: true,
      message: "Code submitted successfully.",
      data: {
        submissionId:  submission._id,
        submittedAt:   submission.submittedAt,
        language:      submission.language,
        registerNumber: submission.registerNumber,
      },
    });

  } catch (error: any) {
    console.error("submitCode error:", error);

    if (error.code === 11000) {
      res.status(400).json({ success: false, message: "Duplicate submission detected." });
      return;
    }

    res.status(500).json({ success: false, message: "Internal server error during code submission." });
  }
};
