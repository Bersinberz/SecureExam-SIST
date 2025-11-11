import { Request, Response } from "express";
import { Student } from "../models/studentModel";
import Submission from "../models/Submission";
import { getUserIdFromToken, getUserTypeFromToken } from "../utils/tokenUtils";
import { Types } from "mongoose";

// ------------------ TYPE DEFINITIONS ------------------
interface IStudent {
  _id: Types.ObjectId;
  userName: string;
  registerNumber: number;
  department: string;
  section: string;
  year: string;
}

// ------------------ VALIDATION UTILS ------------------
const validationUtils = {
  isValidRegisterNumber: (registerNumber: string): boolean => {
    const regNoRegex = /^\d{8}$/;
    return regNoRegex.test(registerNumber);
  },

  // Validate ObjectId
  isValidObjectId: (id: string): boolean => {
    return Types.ObjectId.isValid(id);
  },

  // Basic input sanitization
  sanitizeInput: (input: string): string => {
    if (typeof input !== 'string') return input;
    return input.trim();
  },

  // Validate department format
  isValidDepartment: (department: string): boolean => {
    if (!department || typeof department !== 'string') return false;
    return department.trim().length > 0 && department.trim().length <= 50;
  },

  // Validate section format
  isValidSection: (section: string): boolean => {
    if (!section || typeof section !== 'string') return false;
    return section.trim().length > 0 && section.trim().length <= 10;
  },

  // Validate year format
  isValidYear: (year: string): boolean => {
    if (!year || typeof year !== 'string') return false;
    const validYears = ['1', '2', '3', '4', 'I', 'II', 'III', 'IV', '1st', '2nd', '3rd', '4th'];
    return validYears.includes(year.trim());
  },

  // Validate exam ID format
  isValidExamId: (examId: string): boolean => {
    if (!examId || typeof examId !== 'string') return false;
    return examId.trim().length > 0 && validationUtils.isValidObjectId(examId);
  }
};

// ------------------ REQUEST VALIDATION ------------------
const validateGetStudentsRequest = (req: Request): { isValid: boolean; message: string } => {
  const { department, section, year, examId } = req.query;

  // Check required fields
  if (!department || !section || !year) {
    return { isValid: false, message: "Department, section, and year are required" };
  }

  // Check data types
  if (typeof department !== 'string' || typeof section !== 'string' || typeof year !== 'string') {
    return { isValid: false, message: "Department, section, and year must be strings" };
  }

  // Validate department format
  if (!validationUtils.isValidDepartment(department)) {
    return { isValid: false, message: "Invalid department format" };
  }

  // Validate section format
  if (!validationUtils.isValidSection(section)) {
    return { isValid: false, message: "Invalid section format" };
  }

  // Validate year format
  if (!validationUtils.isValidYear(year)) {
    return { isValid: false, message: "Invalid year format" };
  }

  // Validate examId if provided
  if (examId && typeof examId === 'string' && !validationUtils.isValidExamId(examId)) {
    return { isValid: false, message: "Invalid exam ID format" };
  }

  return { isValid: true, message: "Request is valid" };
};

const validateGetSubmissionRequest = (req: Request): { isValid: boolean; message: string } => {
  const { registerNumber } = req.params;

  // Check if register number is provided
  if (!registerNumber) {
    return { isValid: false, message: "Register number is required" };
  }

  // Validate register number format
  if (!validationUtils.isValidRegisterNumber(registerNumber)) {
    return { isValid: false, message: "Invalid register number format. Must be 8 digits." };
  }

  return { isValid: true, message: "Request is valid" };
};

const validateGetAllSubmissionsRequest = (req: Request): { isValid: boolean; message: string } => {
  const { department, section, year, examId } = req.query;

  // At least one filter parameter is required
  if (!department && !section && !year && !examId) {
    return { isValid: false, message: "At least one filter parameter (department, section, year, or examId) is required" };
  }

  // Validate department if provided
  if (department && typeof department === 'string' && !validationUtils.isValidDepartment(department)) {
    return { isValid: false, message: "Invalid department format" };
  }

  // Validate section if provided
  if (section && typeof section === 'string' && !validationUtils.isValidSection(section)) {
    return { isValid: false, message: "Invalid section format" };
  }

  // Validate year if provided
  if (year && typeof year === 'string' && !validationUtils.isValidYear(year)) {
    return { isValid: false, message: "Invalid year format" };
  }

  // Validate examId if provided
  if (examId && typeof examId === 'string' && !validationUtils.isValidExamId(examId)) {
    return { isValid: false, message: "Invalid exam ID format" };
  }

  return { isValid: true, message: "Request is valid" };
};

// ------------------ AUTHENTICATION VALIDATION ------------------
const validateAuthentication = (req: Request): { isValid: boolean; message: string; userId?: string } => {
  try {
    // Token validation - only staff can access these endpoints
    const userType = getUserTypeFromToken(req);
    if (userType !== "staff") {
      return { isValid: false, message: "Access denied. Staff access required." };
    }

    // Extract and validate user ID from token
    const userId = getUserIdFromToken(req);
    if (!userId || !validationUtils.isValidObjectId(userId)) {
      return { isValid: false, message: "Invalid user token" };
    }

    return { isValid: true, message: "Authentication valid", userId };
  } catch (error) {
    return { isValid: false, message: "Authentication failed" };
  }
};

// ------------------ GET STUDENTS BY FILTER ------------------
export const getStudentsByFilter = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request parameters
    const requestValidation = validateGetStudentsRequest(req);
    if (!requestValidation.isValid) {
      res.status(400).json({ 
        success: false,
        message: requestValidation.message 
      });
      return;
    }

    // Validate authentication
    const authValidation = validateAuthentication(req);
    if (!authValidation.isValid) {
      res.status(403).json({
        success: false,
        message: authValidation.message,
      });
      return;
    }

    const { department, section, year, examId } = req.query;

    // Get students from database
    const students = await Student.find(
      { 
        department: validationUtils.sanitizeInput(department as string), 
        section: validationUtils.sanitizeInput(section as string), 
        year: validationUtils.sanitizeInput(year as string) 
      },
      "userName registerNumber department section year"
    ).sort({ registerNumber: 1 }).lean<IStudent[]>();

    // If examId is provided, get submissions for this exam
    let submissions: any[] = [];
    if (examId && typeof examId === 'string') {
      submissions = await Submission.find({
        department: validationUtils.sanitizeInput(department as string),
        section: validationUtils.sanitizeInput(section as string), 
        year: validationUtils.sanitizeInput(year as string),
        examId: validationUtils.sanitizeInput(examId)
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
        registerNumber: student.registerNumber.toString(),
        department: student.department,
        section: student.section,
        year: student.year,
        hasSubmitted: !!submission,
        submission: submission ? {
          submittedAt: submission.submittedAt,
          language: submission.language,
          status: submission.status,
          assignedQuestion: submission.assignedQuestion
        } : undefined
      };
    });

    res.status(200).json({
      success: true,
      message: "Students fetched successfully",
      data: studentsWithSubmissionStatus,
      total: studentsWithSubmissionStatus.length,
      withSubmissions: studentsWithSubmissionStatus.filter(s => s.hasSubmitted).length,
      withoutSubmissions: studentsWithSubmissionStatus.filter(s => !s.hasSubmitted).length
    });

  } catch (err: any) {
    // Handle specific errors
    if (err.name === 'CastError') {
      res.status(400).json({ 
        success: false,
        message: "Invalid data format in request" 
      });
      return;
    }

    // Handle database connection errors
    if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
      res.status(503).json({ 
        success: false,
        message: "Database temporarily unavailable. Please try again." 
      });
      return;
    }

    res.status(500).json({ 
      success: false,
      message: "Internal server error while fetching students" 
    });
  }
};

// ------------------ GET SUBMISSION BY REGISTER NUMBER ------------------
export const getSubmissionByRegisterNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request parameters
    const requestValidation = validateGetSubmissionRequest(req);
    if (!requestValidation.isValid) {
      res.status(400).json({
        success: false,
        message: requestValidation.message,
      });
      return;
    }

    // Validate authentication
    const authValidation = validateAuthentication(req);
    if (!authValidation.isValid) {
      res.status(403).json({
        success: false,
        message: authValidation.message,
      });
      return;
    }

    const { registerNumber } = req.params;

    // First, find the student to get their username
    const student = await Student.findOne({ 
      registerNumber: validationUtils.sanitizeInput(registerNumber)
    }).lean();

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    // Find submission by register number
    const submission = await Submission.findOne({ 
      registerNumber: validationUtils.sanitizeInput(registerNumber)
    }).lean();

    if (!submission) {
      res.status(404).json({
        success: false,
        message: `No submission found for ${student.userName}`,
      });
      return;
    }

    // Return the complete submission data including code
    res.status(200).json({
      success: true,
      message: "Submission fetched successfully",
      data: {
        _id: submission._id,
        registerNumber: submission.registerNumber,
        userName: submission.userName,
        department: submission.department,
        section: submission.section,
        year: submission.year,
        assignedQuestion: submission.assignedQuestion,
        code: submission.code,
        language: submission.language,
        examId: submission.examId,
        submittedAt: submission.submittedAt,
        status: submission.status
      }
    });

  } catch (error: any) {
    // Handle specific errors
    if (error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: "Invalid register number format",
      });
      return;
    }

    // Handle database connection errors
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. Please try again.",
      });
      return;
    }

    // Handle token errors
    if (error.message?.includes("token") || error.message?.includes("authentication")) {
      res.status(401).json({
        success: false,
        message: "Authentication failed. Please log in again.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while fetching submission",
    });
  }
};

// ------------------ GET ALL SUBMISSIONS BY FILTER ------------------
export const getAllSubmissionsByFilter = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request parameters
    const requestValidation = validateGetAllSubmissionsRequest(req);
    if (!requestValidation.isValid) {
      res.status(400).json({
        success: false,
        message: requestValidation.message,
      });
      return;
    }

    // Validate authentication
    const authValidation = validateAuthentication(req);
    if (!authValidation.isValid) {
      res.status(403).json({
        success: false,
        message: authValidation.message,
      });
      return;
    }

    const { department, section, year, examId } = req.query;

    // Build filter object with sanitized inputs
    const filter: any = {};
    if (department && typeof department === 'string') {
      filter.department = validationUtils.sanitizeInput(department);
    }
    if (section && typeof section === 'string') {
      filter.section = validationUtils.sanitizeInput(section);
    }
    if (year && typeof year === 'string') {
      filter.year = validationUtils.sanitizeInput(year);
    }
    if (examId && typeof examId === 'string') {
      filter.examId = validationUtils.sanitizeInput(examId);
    }

    // Find all submissions matching the filter
    const submissions = await Submission.find(filter)
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Submissions fetched successfully",
      data: submissions,
      total: submissions.length
    });

  } catch (error: any) {
    // Handle database connection errors
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. Please try again.",
      });
      return;
    }

    // Handle validation errors
    if (error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: "Invalid filter parameters",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while fetching submissions",
    });
  }
};

// ------------------ DOWNLOAD ALL SUBMISSIONS AS ZIP ------------------
// ------------------ DOWNLOAD ALL SUBMISSIONS AS ZIP ------------------
export const downloadAllSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req);
    if (!authValidation.isValid) {
      res.status(403).json({
        success: false,
        message: authValidation.message,
      });
      return;
    }

    const { department, section, year, examId } = req.query;

    // Validate required parameters
    if (!department || !section || !year) {
      res.status(400).json({
        success: false,
        message: "Department, section, and year are required for download",
      });
      return;
    }

    // Get students from the specific department, section, and year
    const students = await Student.find(
      { 
        department: validationUtils.sanitizeInput(department as string), 
        section: validationUtils.sanitizeInput(section as string), 
        year: validationUtils.sanitizeInput(year as string) 
      },
      "userName registerNumber department section year"
    ).sort({ registerNumber: 1 }).lean<IStudent[]>();

    if (students.length === 0) {
      res.status(404).json({
        success: false,
        message: "No students found for the given criteria",
      });
      return;
    }

    // Get submissions for these students (with optional examId filter)
    const submissionFilter: any = {
      department: validationUtils.sanitizeInput(department as string),
      section: validationUtils.sanitizeInput(section as string), 
      year: validationUtils.sanitizeInput(year as string)
    };
    
    if (examId && typeof examId === 'string') {
      submissionFilter.examId = validationUtils.sanitizeInput(examId);
    }

    const submissions = await Submission.find(submissionFilter);

    // Create a zip file
    const archiver = require('archiver');
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="students_${department}_${section}_${year}.zip"`);

    // Pipe archive to response
    archive.pipe(res);

    // Add each student's data as a text file
    students.forEach((student) => {
      const submission = submissions.find(
        sub => sub.registerNumber === student.registerNumber.toString()
      );
      
      const fileName = `${student.registerNumber}_${student.userName.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      
      const fileContent = `
STUDENT INFORMATION
===================

Personal Details:
-----------------
Name: ${student.userName}
Register Number: ${student.registerNumber}
Department: ${student.department}
Section: ${student.section}
Year: ${student.year}

Submission Status:
-----------------
Has Submitted: ${submission ? 'Yes' : 'No'}

${submission ? `
SUBMISSION DETAILS
==================

Submission Information:
----------------------
Submitted At: ${new Date(submission.submittedAt).toLocaleString()}
Programming Language: ${submission.language}
Exam ID: ${submission.examId}
Status: ${submission.status}

Assigned Question:
-----------------
${submission.assignedQuestion}

Submitted Code:
--------------
${submission.code}
` : `
NO SUBMISSION FOUND
===================
This student has not submitted any code for the current exam.
`}

===================
End of Student Record
`.trim();

      archive.append(fileContent, { name: fileName });
    });

    // Finalize the archive
    await archive.finalize();

  } catch (error: any) {
    console.error('Error creating zip file:', error);
    
    // Handle specific errors
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. Please try again.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Error creating download file",
    });
  }
};