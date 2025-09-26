import { Request, Response } from "express";
import { Exam } from "../models/ExamModel";
import { Question } from "../models/QuestionModel";
import { createToken } from "../utils/jwt";
import { Student } from "../models/UserModel";
import { Staff } from "../models/StaffModel";

// ------------------ LOGIN CONTROLLER ------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    let { identifier, password, userType } = req.body;

    // ---------- BASIC SANITIZATION ----------
    if (typeof identifier === "string") identifier = identifier.trim();
    if (typeof password === "string") password = password.trim();
    if (typeof userType === "string") userType = userType.trim().toLowerCase();

    // ---------- CORE VALIDATION ----------
    if (!identifier || !password || !userType) {
      res.status(400).json({ message: "All fields are required!" });
      return;
    }

    if (typeof identifier !== "string" || typeof password !== "string" || typeof userType !== "string") {
      res.status(400).json({ message: "Invalid data format!" });
      return;
    }

    if (!["student", "staff"].includes(userType)) {
      res.status(400).json({ message: "Invalid user type! Must be student or staff." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters long!" });
      return;
    }

    // ---------- ROUTE HANDLING ----------
    if (userType === "student") {
      await handleStudentLogin(identifier, password, res);
    } else {
      await handleStaffLogin(identifier, password, res);
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error!" });
  }
};

// ------------------ STUDENT LOGIN ------------------
const handleStudentLogin = async (identifier: string, password: string, res: Response) => {
  // Ensure identifier is numeric register number
  const registerNumber = parseInt(identifier, 10);
  if (isNaN(registerNumber)) {
    res.status(400).json({ message: "Register number must be numeric!" });
    return;
  }

  const student = await Student.findOne({ registerNumber });
  if (!student) {
    res.status(401).json({ message: "Student not found!" });
    return;
  }

  // Compare plain-text password
  if (student.password !== password) {
    res.status(401).json({ message: "Invalid Credentials!" });
    return;
  }

  // Validate department & section
  if (!student.department || !student.section) {
    res.status(400).json({ message: "Student profile incomplete!" });
    return;
  }

  const exams = await Exam.find({ department: student.department, section: student.section });
  if (!exams.length) {
    res.status(404).json({ message: "No exams found" });
    return;
  }

  const questions = await Question.find({ department: student.department, section: student.section });
  if (!questions.length) {
    res.status(404).json({ message: "No questions found" });
    return;
  }

  // Assign random question
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  await Student.updateOne({ registerNumber }, { $set: { assignedQuestion: randomQuestion.question } });
  await Question.deleteOne({ _id: randomQuestion._id });

  // Generate JWT
  const token = createToken({
    userId: student._id.toString(),
    userType: "student",
    registerNumber: student.registerNumber,
  });

  res.status(200).json({
    message: "Login successful!",
    exams,
    assignedQuestion: randomQuestion.question,
    registerNumber: student.registerNumber,
    token,
  });
};

// ------------------ STAFF LOGIN ------------------
const handleStaffLogin = async (email: string, password: string, res: Response) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "Invalid email format!" });
    return;
  }

  const staff = await Staff.findOne({ email });
  if (!staff) {
    res.status(401).json({ message: "Staff not found!" });
    return;
  }

  if (staff.password !== password) {
    res.status(401).json({ message: "Invalid Credentials!" });
    return;
  }

  const token = createToken({
    userId: staff._id.toString(),
    userType: "staff",
    email: staff.email,
  });

  res.status(200).json({ message: "Login successful!", token });
};