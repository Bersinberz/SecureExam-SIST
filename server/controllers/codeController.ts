import { Request, Response } from "express";
import { Student } from "../models/studentModel";
import { ExamModel } from "../models/examModel";
import { getUserIdFromToken, getUserTypeFromToken } from "../utils/tokenUtils";
import Submission from "../models/Submission";

// ------------------ GET EXAM DATA ------------------
export const getExamData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userType = getUserTypeFromToken(req);

    if (userType !== "student") {
      res.status(403).json({
        success: false,
        message: "Access denied. Student access required.",
      });
      return;
    }

    // Extract registerNumber from token or student record
    const userId = getUserIdFromToken(req);
    const student = await Student.findById(userId);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found!",
      });
      return;
    }

    if (!student.department || !student.section || !student.year) {
      res.status(400).json({
        success: false,
        message: "Student profile incomplete. Missing department, section, or year.",
      });
      return;
    }

    const exams = await ExamModel.find({
      department: student.department,
      section: student.section,
      year: student.year,
    });

    if (!exams.length) {
      res.status(404).json({
        success: false,
        message: `No exams available for ${student.department} - ${student.section} - Year ${student.year}.`,
      });
      return;
    }

    const currentExam = exams[0];

    res.status(200).json({
      success: true,
      message: "Exam data fetched successfully",
      data: {
        exam: {
          id: currentExam._id,
          name: currentExam.examName,
          time: currentExam.examTime,
          department: currentExam.department,
          section: currentExam.section,
          year: currentExam.year,
        },
        student: {
          registerNumber: student.registerNumber,
          userName: student.userName,
          department: student.department,
          section: student.section,
          year: student.year,
        },
        assignedQuestion: student.assignedQuestion || "No question assigned",
      },
    });
  } catch (error) {
    console.error("Get exam data error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching exam data",
    });
  }
};

// ------------------ SUBMIT CODE ------------------
export const submitCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { language, code, assignedQuestion } = req.body;
    
    // Get user data directly from token using your utility functions
    const userId = getUserIdFromToken(req);
    const student = await Student.findById(userId);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found!"
      });
      return;
    }

    // Validation
    if (!language || !code || !assignedQuestion) {
      res.status(400).json({
        success: false,
        message: "Language, code, and assigned question are required"
      });
      return;
    }

    // Find the relevant exam for this student
    const exams = await ExamModel.find({
      department: student.department,
      section: student.section,
      year: student.year,
    });

    if (!exams.length) {
      res.status(404).json({
        success: false,
        message: "No exam found for student"
      });
      return;
    }

    const examId = exams[0]._id;

    // Check if user has already submitted for this exam
    const existingSubmission = await Submission.findOne({
      registerNumber: student.registerNumber,
      examId: examId
    });

    if (existingSubmission) {
      res.status(400).json({
        success: false,
        message: "You have already submitted the exam"
      });
      return;
    }

    // Create new submission
    const submission = new Submission({
      registerNumber: student.registerNumber,
      userName: student.userName,
      department: student.department,
      section: student.section,
      year: student.year,
      assignedQuestion: assignedQuestion,
      code: code,
      language: language,
      examId: examId,
      status: "submitted"
    });

    // Save to database
    await submission.save();

    res.status(200).json({  // Changed from 201 to 200 for consistency
      success: true,
      message: "Code submitted successfully",  // Make sure this message is consistent
      data: {
        submissionId: submission._id,
        submittedAt: submission.submittedAt
      }
    });

  } catch (error: any) {
    console.error("Submit code error:", error);
    
    // Handle specific token errors
    if (error.message.includes("No authorization token") || 
        error.message.includes("Authentication failed")) {
      res.status(401).json({
        success: false,
        message: "Authentication failed: Please log in again"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};