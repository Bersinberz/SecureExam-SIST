import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { ExamModel } from "../models/ExamModel";
import { getUserIdFromToken } from "../utils/tokenUtils";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  user?: any;
}

// Validation interfaces
interface CreateExamRequest {
  name: string;
  time: string;
  department: string;
  section: string;
  year: string;
  file?: Express.Multer.File;
  userId?: string;
}

// Validation functions
const validateExamData = (data: Partial<CreateExamRequest>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required field validation
  if (!data.name?.trim()) errors.push("Exam name is required");
  if (!data.time?.trim()) errors.push("Exam time is required");
  if (!data.department?.trim()) errors.push("Department is required");
  if (!data.section?.trim()) errors.push("Section is required");
  if (!data.year?.trim()) errors.push("Year is required");
  if (!data.file) errors.push("CSV file is required");
  if (!data.userId?.trim()) errors.push("User authentication required");

  // Data type and format validation
  if (data.name) {
    const name = data.name.trim();
    if (name.length < 2) errors.push("Exam name must be at least 2 characters long");
    if (name.length > 100) errors.push("Exam name cannot exceed 100 characters");
    if (!/^[a-zA-Z0-9\s\-_.,()&]+$/.test(name)) {
      errors.push("Exam name can only contain letters, numbers, spaces, and basic punctuation");
    }
  }

  if (data.time) {
    const time = Number(data.time);
    if (isNaN(time) || time <= 0) errors.push("Exam time must be a positive number");
    if (time > 480) errors.push("Exam time cannot exceed 480 minutes (8 hours)");
    if (time < 5) errors.push("Exam time must be at least 5 minutes");
    if (!Number.isInteger(time)) errors.push("Exam time must be a whole number");
  }

  if (data.department) {
    const dept = data.department.trim();
    if (dept.length < 2) errors.push("Department must be at least 2 characters long");
    if (dept.length > 50) errors.push("Department name cannot exceed 50 characters");
    if (!/^[A-Za-z0-9]+$/.test(dept)) {
      errors.push("Department can only contain letters and numbers");
    }
  }

  if (data.section) {
    const sect = data.section.trim();
    if (sect.length < 2) errors.push("Section must be at least 2 characters long");
    if (sect.length > 10) errors.push("Section cannot exceed 10 characters");
    if (!/^[A-Za-z0-9]+$/.test(sect)) {
      errors.push("Section can only contain letters and numbers");
    }
  }
  
  // Updated year validation for academic years
  if (data.year) {
    const validYears = ['1', '2', '3', '4', '1st', '2nd', '3rd', '4th', 'first', 'second', 'third', 'fourth'];
    const normalizedYear = data.year.trim().toLowerCase();
    
    if (!validYears.includes(normalizedYear)) {
      errors.push("Year must be a valid academic year (1st, 2nd, 3rd, or 4th year)");
    }
  }

  // User ID validation
  if (data.userId) {
    if (data.userId.length < 10) errors.push("Invalid user ID format");
    if (!/^[a-fA-F0-9]{24}$/.test(data.userId)) {
      errors.push("Invalid user ID format");
    }
  }

  return { isValid: errors.length === 0, errors };
};

const validateFile = (file: Express.Multer.File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!file) {
    errors.push("No file uploaded");
    return { isValid: false, errors };
  }

  // Check file type
  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv'];
  if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.toLowerCase().endsWith('.csv')) {
    errors.push("Only CSV files are allowed");
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push("File size cannot exceed 5MB");
  }

  // Check file size (min 1 byte)
  if (file.size === 0) {
    errors.push("File cannot be empty");
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (fileExtension !== '.csv') {
    errors.push("File must have .csv extension");
  }

  // Check filename security
  const fileName = file.originalname;
  if (fileName.length > 255) {
    errors.push("File name is too long");
  }
  if (/[<>:"/\\|?*]/.test(fileName)) {
    errors.push("File name contains invalid characters");
  }

  return { isValid: errors.length === 0, errors };
};

const parseCSVFile = async (filePath: string): Promise<{ questions: string[]; errors: string[] }> => {
  const questions: string[] = [];
  const errors: string[] = [];

  return new Promise(async (resolve, reject) => {
    try {
      await fs.promises.access(filePath);
    } catch {
      reject(new Error("CSV file not found"));
      return;
    }

    let rowCount = 0;
    let isEmptyFile = true;

    const stream = fs.createReadStream(filePath)
      .pipe(csvParser({ 
        headers: false,
        mapValues: ({ value }) => value.trim()
      }))
      .on("data", (row) => {
        rowCount++;
        isEmptyFile = false;
        const firstColumn = row[0];
        
        // Skip empty rows
        if (!firstColumn || firstColumn.trim() === "") {
          errors.push(`Row ${rowCount} has empty first column`);
          return;
        }
        
        const question = firstColumn.trim();
        
        // Validate question content
        if (question.length === 0) {
          errors.push(`Row ${rowCount} contains an empty question`);
          return;
        }

        if (question.length > 1000) {
          errors.push(`Row ${rowCount} question is too long (max 1000 characters)`);
          return;
        }

        // Check for potentially malicious content
        if (/<script|javascript:|onload=|onerror=/i.test(question)) {
          errors.push(`Row ${rowCount} contains potentially unsafe content`);
          return;
        }
        
        questions.push(question);
      })
      .on("end", () => {
        if (isEmptyFile || rowCount === 0) {
          errors.push("CSV file is empty");
        }
        if (questions.length === 0 && errors.length === 0) {
          errors.push("No valid questions found in CSV file");
        }
        
        // Validate question count
        if (questions.length > 100) {
          errors.push(`Too many questions (${questions.length}). Maximum allowed is 100.`);
        }
        if (questions.length < 1) {
          errors.push("At least one valid question is required");
        }

        resolve({ questions, errors });
      })
      .on("error", (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      });

    // Handle stream errors
    stream.on("error", (error) => {
      reject(new Error(`Stream error: ${error.message}`));
    });

    // Set timeout for CSV parsing (30 seconds)
    const timeout = setTimeout(() => {
      stream.destroy();
      reject(new Error("CSV parsing timeout - file too large or complex"));
    }, 30000);

    stream.on("end", () => clearTimeout(timeout));
    stream.on("error", () => clearTimeout(timeout));
  });
};

// Normalize academic year to consistent format
const normalizeAcademicYear = (year: string): string => {
  const yearMap: { [key: string]: string } = {
    '1': '1st',
    '2': '2nd', 
    '3': '3rd',
    '4': '4th',
    'first': '1st',
    'second': '2nd',
    'third': '3rd',
    'fourth': '4th'
  };
  
  const normalized = year.trim().toLowerCase();
  return yearMap[normalized] || normalized;
};

// Cleanup function for temporary files
const cleanupFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error("Failed to cleanup file:", filePath, error);
  }
};

// Check for duplicate exam
const checkDuplicateExam = async (
  name: string, 
  department: string, 
  section: string, 
  year: string
): Promise<boolean> => {
  const normalizedYear = normalizeAcademicYear(year);
  
  const existingExam = await ExamModel.findOne({ 
    examName: name.trim(),
    department: department.trim(),
    section: section.trim(),
    year: normalizedYear
  });
  return !!existingExam;
};

export const createExam = async (req: MulterRequest, res: Response) => {
  let tempFilePath: string | null = null;

  try {
    const { name, time, department, section, year } = req.body;
    const file = req.file;

    // Extract user ID from token using imported function
    let userId: string;
    try {
      userId = getUserIdFromToken(req);
    } catch (authError: any) {
      console.error('Auth error details:', authError);
      return res.status(401).json({
        message: "Authentication failed",
        error: authError.message
      });
    }

    // Prepare data for validation
    const examData: Partial<CreateExamRequest> = {
      name,
      time,
      department,
      section,
      year,
      file,
      userId
    };

    // Validate input data
    const dataValidation = validateExamData(examData);
    if (!dataValidation.isValid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: dataValidation.errors
      });
    }

    // Validate file
    const fileValidation = validateFile(file!);
    if (!fileValidation.isValid) {
      return res.status(400).json({
        message: "File validation failed",
        errors: fileValidation.errors
      });
    }

    // Ensure uploads folder exists
    const uploadDir = path.join(__dirname, "..", "uploads");
    try {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create upload directory: ${error.message}`);
    }

    // Move uploaded file from tmp to uploads with unique name
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file!.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    tempFilePath = filePath;

    try {
      await fs.promises.rename(file!.path, filePath);
    } catch (error: any) {
      throw new Error(`Failed to save file: ${error.message}`);
    }

    // Parse CSV file
    const { questions, errors: parseErrors } = await parseCSVFile(filePath);

    // Check if we have critical parsing errors
    if (parseErrors.length > 0 && questions.length === 0) {
      return res.status(400).json({
        message: "Failed to parse CSV file",
        errors: parseErrors
      });
    }

    // Check for minimum questions
    if (questions.length < 1) {
      return res.status(400).json({
        message: "At least one valid question is required"
      });
    }

    // Check for duplicate exam name
    const isDuplicate = await checkDuplicateExam(name, department, section, year);
    if (isDuplicate) {
      return res.status(409).json({
        message: "An exam with the same name already exists for this department, section, and year"
      });
    }

    // Normalize academic year before saving
    const normalizedYear = normalizeAcademicYear(year);

    // Save exam to MongoDB
    const exam = new ExamModel({
      examName: name.trim(),
      examTime: Number(time),
      department: department.trim(),
      section: section.trim(),
      year: normalizedYear,
      questions,
      createdBy: userId,
      createdAt: new Date(),
      parseWarnings: parseErrors.length > 0 ? parseErrors : undefined
    });

    await exam.save();

    // Cleanup temporary file on success
    await cleanupFile(filePath);
    tempFilePath = null;

    // Type-safe access to exam properties
    const examResponse = {
      examName: exam.examName,
      examTime: exam.examTime,
      department: exam.department,
      section: exam.section,
      year: exam.year,
      questionCount: exam.questions.length,
      createdBy: (exam as any).createdBy,
      createdAt: (exam as any).createdAt,
      warnings: (exam as any).parseWarnings || undefined
    };

    return res.status(201).json({
      message: "Exam created successfully!",
      examId: exam._id,
      data: examResponse,
    });

  } catch (error: any) {
    console.error("Create exam error:", error);

    // Cleanup temporary file on error
    if (tempFilePath) {
      await cleanupFile(tempFilePath);
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Database validation failed",
        errors: Object.values(error.errors).map((err: any) => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Exam with similar details already exists"
      });
    }

    if (error.message.includes('CSV') || error.message.includes('file')) {
      return res.status(400).json({
        message: "File processing error",
        error: error.message
      });
    }

    if (error.message.includes('Authentication') || error.message.includes('token')) {
      return res.status(401).json({
        message: "Authentication failed",
        error: error.message
      });
    }

    // Generic server error
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};