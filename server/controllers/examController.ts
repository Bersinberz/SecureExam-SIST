import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { ExamModel } from "../models/ExamModel";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Validation interfaces
interface CreateExamRequest {
  name: string;
  time: string;
  department: string;
  section: string;
  year: string;
  file?: Express.Multer.File;
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

  // Data type and format validation
  if (data.time) {
    const time = Number(data.time);
    if (isNaN(time) || time <= 0) errors.push("Exam time must be a positive number");
    if (time > 480) errors.push("Exam time cannot exceed 480 minutes (8 hours)");
  }

  if (data.name && data.name.length > 100) errors.push("Exam name cannot exceed 100 characters");
  if (data.department && data.department.length > 50) errors.push("Department name cannot exceed 50 characters");
  if (data.section && data.section.length > 10) errors.push("Section cannot exceed 10 characters");
  
  // Updated year validation for academic years
  if (data.year) {
    const validYears = ['1', '2', '3', '4', '1st', '2nd', '3rd', '4th', 'first', 'second', 'third', 'fourth'];
    const normalizedYear = data.year.trim().toLowerCase();
    
    if (!validYears.includes(normalizedYear)) {
      errors.push("Year must be a valid academic year (1st, 2nd, 3rd, or 4th year)");
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
  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push("Only CSV files are allowed");
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push("File size cannot exceed 5MB");
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (fileExtension !== '.csv') {
    errors.push("File must have .csv extension");
  }

  return { isValid: errors.length === 0, errors };
};

const parseCSVFile = async (filePath: string): Promise<{ questions: string[]; errors: string[] }> => {
  const questions: string[] = [];
  const errors: string[] = [];

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error("CSV file not found"));
      return;
    }

    let rowCount = 0;
    const stream = fs.createReadStream(filePath)
      .pipe(csvParser({ 
        headers: false,
        mapValues: ({ value }) => value.trim()
      }))
      .on("data", (row) => {
        rowCount++;
        const firstColumn = row[0];
        
        // Skip empty rows
        if (!firstColumn || firstColumn.trim() === "") {
          errors.push(`Row ${rowCount} has empty first column`);
          return;
        }
        
        const question = firstColumn.trim();
        
        // No length restriction for questions - accept any length
        questions.push(question);
      })
      .on("end", () => {
        if (rowCount === 0) {
          errors.push("CSV file is empty");
        }
        if (questions.length === 0 && errors.length === 0) {
          errors.push("No valid questions found in CSV file");
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
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
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

    // Prepare data for validation
    const examData: Partial<CreateExamRequest> = {
      name,
      time,
      department,
      section,
      year,
      file
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
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (error: any) {
      throw new Error(`Failed to create upload directory: ${error.message}`);
    }

    // Move uploaded file from tmp to uploads with unique name
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file!.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    tempFilePath = filePath;

    try {
      fs.renameSync(file!.path, filePath);
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
      parseWarnings: parseErrors.length > 0 ? parseErrors : undefined
    });

    await exam.save();

    // Cleanup temporary file on success
    await cleanupFile(filePath);
    tempFilePath = null;

    return res.status(201).json({
      message: "Exam created successfully!",
      examId: exam._id,
      data: {
        examName: exam.examName,
        examTime: exam.examTime,
        department: exam.department,
        section: exam.section,
        year: exam.year,
        questionCount: exam.questions.length,
        warnings: parseErrors.length > 0 ? parseErrors : undefined
      },
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

    // Generic server error
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};