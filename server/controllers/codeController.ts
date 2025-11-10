import { Request, Response } from "express";
import { Student } from "../models/studentModel";
import { ExamModel } from "../models/examModel";
import { getUserIdFromToken, getUserTypeFromToken } from "../utils/tokenUtils";
import Submission from "../models/Submission";
import { Types } from "mongoose";

// ------------------ TYPE DEFINITIONS ------------------
interface IStudent {
  _id: Types.ObjectId;
  registerNumber: number;
  userName: string;
  department: string;
  section: string;
  year: number;
  assignedQuestion?: string;
  accountStatus?: 'active' | 'suspended' | 'inactive';
  hasSubmitted?: boolean;
  lastSubmission?: Date;
}

interface IExam {
  _id: Types.ObjectId;
  examName: string;
  examTime: string;
  department: string;
  section: string;
  year: number;
  examStatus?: 'active' | 'completed' | 'upcoming';
}

// ------------------ VALIDATION UTILS ------------------
const validationUtils = {
  // Programming language validation
  isValidLanguage: (language: string): boolean => {
    const validLanguages = ['javascript', 'python', 'java', 'c', 'cpp'];
    return validLanguages.includes(language.toLowerCase());
  },

  // Code validation
  isValidCode: (code: string): { isValid: boolean; message: string } => {
    if (!code || typeof code !== 'string') {
      return { isValid: false, message: "Code must be a non-empty string" };
    }

    if (code.trim().length === 0) {
      return { isValid: false, message: "Code cannot be empty or just whitespace" };
    }

    if (code.length < 10) {
      return { isValid: false, message: "Code seems too short. Minimum 10 characters required" };
    }

    if (code.length > 10000) {
      return { isValid: false, message: "Code exceeds maximum length of 10000 characters" };
    }

    // Check for potentially malicious patterns
    const dangerousPatterns = [
      /system\s*\(/gi,
      /exec\s*\(/gi,
      /eval\s*\(/gi,
      /process\./gi,
      /require\s*\(/gi,
      /import\s*\(/gi,
      /fork\s*\(/gi,
      /spawn\s*\(/gi,
      /rm\s+-rf/gi,
      /del\s+/gi,
      /format\s*\(/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return { isValid: false, message: "Code contains potentially dangerous operations" };
      }
    }

    return { isValid: true, message: "Code is valid" };
  },

  // Question validation
  isValidQuestion: (question: string): { isValid: boolean; message: string } => {
    if (!question || typeof question !== 'string') {
      return { isValid: false, message: "Question must be a non-empty string" };
    }

    if (question.trim().length === 0) {
      return { isValid: false, message: "Question cannot be empty or just whitespace" };
    }

    if (question.length < 10) {
      return { isValid: false, message: "Question seems too short" };
    }

    if (question.length > 1000) {
      return { isValid: false, message: "Question exceeds maximum length of 1000 characters" };
    }

    return { isValid: true, message: "Question is valid" };
  },

  // Basic input sanitization
  sanitizeInput: (input: string): string => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  },

  // SQL injection prevention
  hasSQLInjection: (input: string): boolean => {
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'OR', 'AND', 
      'WHERE', 'FROM', 'TABLE', 'DATABASE', 'SCRIPT', 'ALTER', 'CREATE'
    ];
    const upperInput = input.toUpperCase();
    return sqlKeywords.some(keyword => upperInput.includes(keyword));
  },

  // XSS prevention
  hasXSSAttempt: (input: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  },

  // Validate ObjectId
  isValidObjectId: (id: string): boolean => {
    return Types.ObjectId.isValid(id);
  }
};

// ------------------ REQUEST VALIDATION MIDDLEWARES ------------------
const validateGetExamRequest = (req: Request): { isValid: boolean; message: string } => {
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, message: "Authorization token is required" };
  }

  return { isValid: true, message: "Request is valid" };
};

const validateSubmitCodeRequest = (req: Request): { isValid: boolean; message: string } => {
  // Check request body exists
  if (!req.body || Object.keys(req.body).length === 0) {
    return { isValid: false, message: "Request body is required" };
  }

  const { language, code, assignedQuestion } = req.body;

  // Check required fields
  if (!language || !code || !assignedQuestion) {
    return { isValid: false, message: "Language, code, and assigned question are required" };
  }

  // Check data types
  if (typeof language !== 'string' || typeof code !== 'string' || typeof assignedQuestion !== 'string') {
    return { isValid: false, message: "Language, code, and assigned question must be strings" };
  }

  // Sanitize inputs
  const sanitizedLanguage = validationUtils.sanitizeInput(language);
  const sanitizedCode = validationUtils.sanitizeInput(code);
  const sanitizedQuestion = validationUtils.sanitizeInput(assignedQuestion);

  // Check for SQL injection
  if (validationUtils.hasSQLInjection(sanitizedCode) || validationUtils.hasSQLInjection(sanitizedQuestion)) {
    return { isValid: false, message: "Invalid characters detected in input" };
  }

  // Check for XSS attempts
  if (validationUtils.hasXSSAttempt(sanitizedCode) || validationUtils.hasXSSAttempt(sanitizedQuestion)) {
    return { isValid: false, message: "Potential security threat detected" };
  }

  // Validate language
  if (!validationUtils.isValidLanguage(sanitizedLanguage)) {
    return { isValid: false, message: "Invalid programming language. Supported languages: javascript, python, java, c, cpp" };
  }

  // Validate code
  const codeValidation = validationUtils.isValidCode(sanitizedCode);
  if (!codeValidation.isValid) {
    return { isValid: false, message: codeValidation.message };
  }

  // Validate question
  const questionValidation = validationUtils.isValidQuestion(sanitizedQuestion);
  if (!questionValidation.isValid) {
    return { isValid: false, message: questionValidation.message };
  }

  return { isValid: true, message: "Request is valid" };
};

// ------------------ GET EXAM DATA ------------------
export const getExamData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const requestValidation = validateGetExamRequest(req);
    if (!requestValidation.isValid) {
      res.status(400).json({
        success: false,
        message: requestValidation.message,
      });
      return;
    }

    // Token validation
    const userType = getUserTypeFromToken(req);
    if (userType !== "student") {
      res.status(403).json({
        success: false,
        message: "Access denied. Student access required.",
      });
      return;
    }

    // Extract and validate user ID from token
    const userId = getUserIdFromToken(req);
    if (!userId || !validationUtils.isValidObjectId(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user token",
      });
      return;
    }

    // Find student with validation
    const student = await Student.findById(userId).lean<IStudent>();
    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found!",
      });
      return;
    }

    // Validate student account status using optional chaining
    if (student.accountStatus && student.accountStatus === 'suspended') {
      res.status(403).json({
        success: false,
        message: "Account suspended! Please contact administration.",
      });
      return;
    }

    // Validate student profile completeness - ONLY CHECK IF FIELDS EXIST, NOT FORMAT
    if (!student.department || !student.section || !student.year) {
      res.status(400).json({
        success: false,
        message: "Student profile incomplete. Missing department, section, or year.",
      });
      return;
    }

    // REMOVED: Department format validation
    // REMOVED: Section format validation  
    // REMOVED: Year format validation
    // REMOVED: Register number format validation

    // Find exams with validation - use whatever department value exists
    const exams = await ExamModel.find({
      department: student.department,
      section: student.section,
      year: student.year,
    }).lean<IExam[]>();

    if (!exams || !exams.length) {
      res.status(404).json({
        success: false,
        message: `No exams available for ${student.department} - ${student.section} - Year ${student.year}.`,
      });
      return;
    }

    // Validate exam data structure
    const currentExam = exams[0];
    if (!currentExam.examName || !currentExam.examTime || !currentExam.department || !currentExam.section || !currentExam.year) {
      res.status(500).json({
        success: false,
        message: "Invalid exam data structure!",
      });
      return;
    }

    // Check if exam is active using optional chaining
    if (currentExam.examStatus && currentExam.examStatus === 'completed') {
      res.status(400).json({
        success: false,
        message: "This exam has already been completed!",
      });
      return;
    }

    // Check if student has already submitted for this exam
    const existingSubmission = await Submission.findOne({
      registerNumber: student.registerNumber.toString(),
      examId: currentExam._id.toString()
    });

    // Success response
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
          status: currentExam.examStatus || 'active'
        },
        student: {
          registerNumber: student.registerNumber,
          userName: student.userName,
          department: student.department,
          section: student.section,
          year: student.year,
        },
        assignedQuestion: student.assignedQuestion || "No question assigned",
        hasSubmitted: !!existingSubmission
      },
    });
  } catch (error) {
    console.error("Get exam data error:", error);
    
    // Handle specific token errors
    if (error instanceof Error && (
        error.message.includes("token") || 
        error.message.includes("authentication") ||
        error.message.includes("authorization")
    )) {
      res.status(401).json({
        success: false,
        message: "Authentication failed. Please log in again.",
      });
      return;
    }

    // Handle database errors
    if (error instanceof Error && error.name === 'MongoError') {
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. Please try again.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Error fetching exam data",
    });
  }
};

// ------------------ SUBMIT CODE ------------------
export const submitCode = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const requestValidation = validateSubmitCodeRequest(req);
    if (!requestValidation.isValid) {
      res.status(400).json({
        success: false,
        message: requestValidation.message
      });
      return;
    }

    const { language, code, assignedQuestion } = req.body;

    // Get user data from token with validation
    const userType = getUserTypeFromToken(req);
    if (userType !== "student") {
      res.status(403).json({
        success: false,
        message: "Access denied. Student access required."
      });
      return;
    }

    const userId = getUserIdFromToken(req);
    if (!userId || !validationUtils.isValidObjectId(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user token"
      });
      return;
    }

    // Find student with validation
    const student = await Student.findById(userId).lean<IStudent>();
    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found!"
      });
      return;
    }

    // Validate student account status using optional chaining
    if (student.accountStatus && student.accountStatus === 'suspended') {
      res.status(403).json({
        success: false,
        message: "Account suspended! Cannot submit code."
      });
      return;
    }

    // Validate student profile completeness - ONLY CHECK EXISTENCE, NOT FORMAT
    if (!student.department || !student.section || !student.year) {
      res.status(400).json({
        success: false,
        message: "Student profile incomplete. Cannot submit code."
      });
      return;
    }

    // Find the relevant exam for this student
    const exams = await ExamModel.find({
      department: student.department,
      section: student.section,
      year: student.year,
    }).lean<IExam[]>();

    if (!exams || !exams.length) {
      res.status(404).json({
        success: false,
        message: "No active exam found for your department, section, and year."
      });
      return;
    }

    const exam = exams[0];

    // Validate exam status using optional chaining
    if (exam.examStatus && exam.examStatus === 'completed') {
      res.status(400).json({
        success: false,
        message: "Cannot submit code. The exam has already ended."
      });
      return;
    }

    // Check if user has already submitted for this exam
    const existingSubmission = await Submission.findOne({
      registerNumber: student.registerNumber.toString(),
      examId: exam._id.toString()
    });

    if (existingSubmission) {
      res.status(400).json({
        success: false,
        message: "You have already submitted the exam. Multiple submissions are not allowed."
      });
      return;
    }

    // Validate that assigned question matches student's assigned question
    if (student.assignedQuestion && student.assignedQuestion !== assignedQuestion) {
      res.status(400).json({
        success: false,
        message: "Submitted question does not match your assigned question."
      });
      return;
    }

    // Create new submission with validated data
    const submission = new Submission({
      registerNumber: student.registerNumber.toString(),
      userName: student.userName,
      department: student.department,
      section: student.section,
      year: student.year.toString(),
      assignedQuestion: validationUtils.sanitizeInput(assignedQuestion),
      code: validationUtils.sanitizeInput(code),
      language: language.toLowerCase(),
      examId: exam._id.toString(),
      status: "submitted" as const,
      submittedAt: new Date()
    });

    // Save to database
    await submission.save();

    // Update student's submission status (optional)
    await Student.findByIdAndUpdate(userId, {
      $set: { 
        hasSubmitted: true, 
        lastSubmission: new Date(),
        assignedQuestion: assignedQuestion // Update assigned question if not already set
      }
    });

    res.status(200).json({
      success: true,
      message: "Code submitted successfully",
      data: {
        submissionId: submission._id,
        submittedAt: submission.submittedAt,
        language: submission.language,
        question: submission.assignedQuestion,
        registerNumber: submission.registerNumber
      }
    });

  } catch (error: any) {
    console.error("Submit code error:", error);
    
    // Handle specific token errors
    if (error.message.includes("No authorization token") || 
        error.message.includes("Authentication failed") ||
        error.message.includes("token")) {
      res.status(401).json({
        success: false,
        message: "Authentication failed: Please log in again"
      });
      return;
    }

    // Handle database validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors
      });
      return;
    }

    // Handle duplicate submission attempts
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Duplicate submission detected"
      });
      return;
    }

    // Handle database connection errors
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable. Please try again."
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during code submission"
    });
  }
};