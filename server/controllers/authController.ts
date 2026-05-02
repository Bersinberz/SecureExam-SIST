import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createToken } from "../utils/tokenUtils";
import { Student } from "../models/studentModel";
import { ExamModel } from "../models/ExamModel";
import { Staff } from "../models/StaffModel";
import { blockToken } from "../utils/tokenBlocklist";
import { AuthRequest } from "../middleware/jwtMiddleware";

// ------------------ LOGOUT ------------------
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token && req.user?.exp) {
    await blockToken(token, req.user.exp);
  }

  res.status(200).json({ success: true, message: "Logged out successfully." });
};

// ------------------ LOGIN CONTROLLER ------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    let { identifier, password, userType } = req.body;

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: "Request body is required!" });
      return;
    }

    if (typeof identifier === "string") identifier = identifier.trim();
    if (typeof password === "string") password = password.trim();
    if (typeof userType === "string") userType = userType.trim().toLowerCase();

    if (!identifier || !password || !userType) {
      res.status(400).json({ success: false, message: "All fields are required: identifier, password, and userType!" });
      return;
    }

    if (typeof identifier !== "string" || typeof password !== "string" || typeof userType !== "string") {
      res.status(400).json({ success: false, message: "Invalid data format! All fields must be strings." });
      return;
    }

    if (!["student", "staff"].includes(userType)) {
      res.status(400).json({ success: false, message: "Invalid user type! Must be 'student' or 'staff'." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters long!" });
      return;
    }

    if (userType === "student") {
      await handleStudentLogin(identifier, password, res);
    } else {
      await handleStaffLogin(identifier, password, res);
    }
  } catch (error) {
    console.error("Login controller error:", error);
    res.status(500).json({ success: false, message: "Internal server error! Please try again later." });
  }
};

// ------------------ STUDENT LOGIN ------------------
const handleStudentLogin = async (identifier: string, password: string, res: Response) => {
  try {
    const registerNumber = parseInt(identifier, 10);

    if (isNaN(registerNumber) || identifier.length !== 8) {
      res.status(400).json({ success: false, message: "Register number must be exactly 8 digits!" });
      return;
    }

    const student = await Student.findOne({ registerNumber });
    if (!student) {
      res.status(401).json({ success: false, message: "Invalid credentials." });
      return;
    }

    if (!await bcrypt.compare(password, student.password)) {
      res.status(401).json({ success: false, message: "Invalid credentials." });
      return;
    }

    if (!student.department || !student.section || !student.year) {
      res.status(400).json({ success: false, message: "Student profile incomplete! Please contact administration." });
      return;
    }

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

    const currentExam = exams[0];

    if (!currentExam.questions || currentExam.questions.length === 0) {
      res.status(404).json({ success: false, message: "No questions available for your exam. Please contact administrator." });
      return;
    }

    // Atomically pop a question — prevents race condition on concurrent logins
    const updatedExam = await ExamModel.findOneAndUpdate(
      { _id: currentExam._id, questions: { $exists: true, $not: { $size: 0 } } },
      { $pop: { questions: -1 } },
      { new: false }
    );

    if (!updatedExam || !updatedExam.questions || updatedExam.questions.length === 0) {
      res.status(404).json({ success: false, message: "No questions available for your exam. Please contact administrator." });
      return;
    }

    const assignedQuestion = updatedExam.questions[0];

    await Student.updateOne(
      { registerNumber },
      { $set: { assignedQuestion } }
    );

    const token = createToken({
      userId: student._id.toString(),
      userType: "student",
      registerNumber: student.registerNumber,
    });

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: { token, userType: "student", registerNumber: student.registerNumber }
    });

  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ success: false, message: "Error during student login. Please try again." });
  }
};

// ------------------ STAFF LOGIN ------------------
const handleStaffLogin = async (email: string, password: string, res: Response) => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email format!" });
      return;
    }

    const staff = await Staff.findOne({ email: email.toLowerCase() });
    if (!staff) {
      // Same message as wrong password — don't reveal whether email exists
      res.status(401).json({ success: false, message: "Invalid credentials." });
      return;
    }

    if (!await bcrypt.compare(password, staff.password)) {
      res.status(401).json({ success: false, message: "Invalid credentials." });
      return;
    }

    const token = createToken({
      userId: staff._id.toString(),
      userType: "staff",
      email: staff.email,
    });

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: { token, userType: "staff", email: staff.email }
    });

  } catch (error) {
    console.error("Staff login error:", error);
    res.status(500).json({ success: false, message: "Error during staff login. Please try again." });
  }
};
