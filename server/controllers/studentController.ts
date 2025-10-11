import { Request, Response } from 'express';
import { Student } from '../models/studentModel';

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { department, section } = req.query;

    const students = await Student.find({
      department: { $regex: `^${department}$`, $options: "i" },
      section: { $regex: `^${section}$`, $options: "i" }
    });

    if (students.length === 0) {
      res.status(404).json({ error: "No students found" });
      return;
    }

    res.json(students);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Server error" });
  }
};