import { Request, Response } from "express";
import { Student } from "../models/studentModel";
import { ExamModel } from "../models/examModel";
import { getUserIdFromToken, getUserTypeFromToken } from "../utils/tokenUtils";

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
