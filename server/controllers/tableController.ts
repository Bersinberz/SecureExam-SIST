import { Request, Response } from "express";
import { Student } from "../models/studentModel";
import Submission from "../models/Submission";

// If you want to keep the existing function name but add WebSocket support
export const getStudentsByFilter = async (req: Request, res: Response) => {
  try {
    const { department, section, year, examId } = req.query;

    if (!department || !section || !year) {
      return res.status(400).json({ 
        success: false,
        message: "Department, section, and year are required" 
      });
    }

    console.log('Fetching students with filter:', { department, section, year, examId });

    // Get students from database
    const students = await Student.find(
      { department, section, year },
      "userName registerNumber department section year"
    ).sort({ registerNumber: 1 });

    // If examId is provided, get submissions for this exam
    let submissions: any[] = [];
    if (examId) {
      submissions = await Submission.find({
        department,
        section, 
        year,
        examId
      });
    }

    // Combine student data with submission status
    const studentsWithSubmissionStatus = students.map(student => {
      const submission = submissions.find(
        sub => sub.registerNumber === student.registerNumber.toString()
      );
      
      return {
        _id: student._id,
        userName: student.userName,
        registerNumber: student.registerNumber.toString(), // Ensure string format
        department: student.department,
        section: student.section,
        year: student.year,
        hasSubmitted: !!submission,
        submission: submission ? {
          submittedAt: submission.submittedAt,
          language: submission.language,
          status: submission.status,
          assignedQuestion: submission.assignedQuestion
        } : null
      };
    });

    res.json(studentsWithSubmissionStatus);

  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch students" 
    });
  }
};