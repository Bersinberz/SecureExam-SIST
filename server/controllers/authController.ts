import { Request, Response } from "express";
import { createToken } from "../utils/tokenUtils";
import { Student } from "../models/studentModel";
import { ExamModel } from "../models/examModel";
import { Staff } from "../models/staffModel";

// ------------------ LOGIN CONTROLLER ------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    let { identifier, password, userType } = req.body;

    // Validate request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({ 
        success: false,
        message: "Request body is required!" 
      });
      return;
    }

    // Sanitize inputs
    if (typeof identifier === "string") identifier = identifier.trim();
    if (typeof password === "string") password = password.trim();
    if (typeof userType === "string") userType = userType.trim().toLowerCase();

    // Validate required fields
    if (!identifier || !password || !userType) {
      res.status(400).json({ 
        success: false,
        message: "All fields are required: identifier, password, and userType!" 
      });
      return;
    }

    // Validate data types
    if (typeof identifier !== "string" || typeof password !== "string" || typeof userType !== "string") {
      res.status(400).json({ 
        success: false,
        message: "Invalid data format! All fields must be strings." 
      });
      return;
    }

    // Validate user type
    if (!["student", "staff"].includes(userType)) {
      res.status(400).json({ 
        success: false,
        message: "Invalid user type! Must be 'student' or 'staff'." 
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long!" 
      });
      return;
    }

    // Route to appropriate login handler
    if (userType === "student") {
      await handleStudentLogin(identifier, password, res);
    } else {
      await handleStaffLogin(identifier, password, res);
    }
  } catch (error) {
    console.error("Login controller error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error! Please try again later." 
    });
  }
};

// ------------------ STUDENT LOGIN ------------------
const handleStudentLogin = async (identifier: string, password: string, res: Response) => {
  try {
    // Convert identifier to register number
    const registerNumber = parseInt(identifier, 10);
    
    // Validate register number format
    if (isNaN(registerNumber) || identifier.length !== 8) {
      res.status(400).json({ 
        success: false,
        message: "Register number must be exactly 8 digits!" 
      });
      return;
    }

    // Find student by register number
    const student = await Student.findOne({ registerNumber });
    if (!student) {
      res.status(401).json({ 
        success: false,
        message: "Student not found! Please check your register number." 
      });
      return;
    }

    // Verify password
    if (student.password !== password) {
      res.status(401).json({ 
        success: false,
        message: "Invalid password! Please check your credentials." 
      });
      return;
    }

    // Check if student has department, section, and year
    if (!student.department || !student.section || !student.year) {
      res.status(400).json({ 
        success: false,
        message: "Student profile incomplete! Please contact administration." 
      });
      return;
    }

    // Check if exams exist for student's department, section, and year
    const exams = await ExamModel.find({ 
      department: student.department, 
      section: student.section,
      year: student.year
    });
    
    if (!exams.length) {
      res.status(404).json({ 
        success: false,
        message: `No exams available for ${student.department} - ${student.section} - Year ${student.year}.` 
      });
      return;
    }

    // Select the first matching exam
    const currentExam = exams[0];
    
    // Check if exam has questions
    if (!currentExam.questions || currentExam.questions.length === 0) {
      res.status(404).json({ 
        success: false,
        message: "No questions available for your exam. Please contact administrator." 
      });
      return;
    }

    // Assign a random question from the exam
    const randomIndex = Math.floor(Math.random() * currentExam.questions.length);
    const assignedQuestion = currentExam.questions[randomIndex];
    
    // Remove the assigned question from the exam's questions array
    await ExamModel.updateOne(
      { _id: currentExam._id },
      { 
        $pull: { 
          questions: assignedQuestion 
        } 
      }
    );

    // Update student with the assigned question
    await Student.updateOne(
      { registerNumber }, 
      { 
        $set: { 
          assignedQuestion: assignedQuestion
        } 
      }
    );

    // Generate JWT token
    const token = createToken({
      userId: student._id.toString(),
      userType: "student",
      registerNumber: student.registerNumber,
    });

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        token,
        userType: "student",
        registerNumber: student.registerNumber
      }
    });

  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error during student login. Please try again." 
    });
  }
};

// ------------------ STAFF LOGIN ------------------
const handleStaffLogin = async (email: string, password: string, res: Response) => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        success: false, 
        message: "Invalid email format! Please enter a valid email address." 
      });
      return;
    }

    // Find staff by email
    const staff = await Staff.findOne({ email: email.toLowerCase() });
    if (!staff) {
      res.status(404).json({ 
        success: false, 
        message: "No data available for this staff account." 
      });
      return;
    }

    // Verify password
    if (staff.password !== password) {
      res.status(401).json({ 
        success: false, 
        message: "Invalid password! Please check your credentials." 
      });
      return;
    }

    // Generate JWT token
    const token = createToken({
      userId: staff._id.toString(),
      userType: "staff",
      email: staff.email,
    });

    // Send success response
    res.status(200).json({ 
      success: true,
      message: "Login successful!",
      data: {
        token,
        userType: "staff",
        email: staff.email
      }
    });

  } catch (error) {
    console.error("Staff login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error during staff login. Please try again." 
    });
  }
};