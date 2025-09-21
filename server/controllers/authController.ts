import { Request, Response } from "express";
import { Exam } from "../models/ExamModel";
import { Question } from "../models/QuestionModel";
import { createToken } from "../utils/jwt";
import { Student } from "../models/UserModel";
import { Staff } from "../models/StaffModel";

// Login controller
export const login = async (req: Request, res: Response): Promise<void> => {
  const { identifier, password, userType } = req.body;

  try {
    if (userType === "student") {
      await handleStudentLogin(identifier, password, res);
    } else if (userType === "staff") {
      await handleStaffLogin(identifier, password, res);
    } else {
      res.status(400).json({ message: "Invalid user type!" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error!" });
  }
};

// Handle student login
const handleStudentLogin = async (identifier: string, password: string, res: Response) => {
  const registerNumber = parseInt(identifier, 10);
  const student = await Student.findOne({ registerNumber });

  if (!student || password !== student.password) {
    res.status(401).json({ message: "Invalid Credentials!" });
    return;
  }

  const exams = await Exam.find({ department: student.department, section: student.section });
  if (!exams.length) return res.status(404).json({ message: "No exams found" });

  const questions = await Question.find({ department: student.department, section: student.section });
  if (!questions.length) return res.status(404).json({ message: "No questions found" });

  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

  await Student.updateOne({ registerNumber }, { $set: { assignedQuestion: randomQuestion.question } });
  await Question.deleteOne({ _id: randomQuestion._id });

  // Generate JWT using centralized utility
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

// Handle staff login
const handleStaffLogin = async (email: string, password: string, res: Response) => {
  const staff = await Staff.findOne({ email });

  if (!staff || password !== staff.password) {
    res.status(401).json({ message: "Invalid Credentials!" });
    return;
  }

  // Generate JWT using centralized utility
  const token = createToken({
    userId: staff._id.toString(),
    userType: "staff",
    email: staff.email,
  });

  res.status(200).json({ message: "Login successful!", token });
};
