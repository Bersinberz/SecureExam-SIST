import { Request, Response } from "express";
import { Student } from "../models/studentModel";

// GET /api/students?department=CS&section=A&year=3
export const getStudentsByFilter = async (req: Request, res: Response) => {
  try {
    const { department, section, year } = req.query;

    if (!department || !section || !year) {
      return res.status(400).json({ message: "Department, section, and year are required" });
    }

    const students = await Student.find(
      { department, section, year },
      "userName registerNumber department section year" // only required fields
    ).sort({ registerNumber: 1 });

    res.json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};
