import { Request, Response } from 'express';
import { Exam } from '../models/ExamModel';
import { Question } from '../models/QuestionModel';
import { Student } from '../models/UserModel';
import { parseCSV } from '../middleware/upload';

export const getExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { registerNumber } = req.query;
    
    if (!registerNumber) {
      res.status(400).json({ message: "Register number is required" });
      return;
    }

    const student = await Student.findOne({ registerNumber: parseInt(registerNumber as string, 10) });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const exams = await Exam.find({
      department: student.department,
      section: student.section,
    });

    if (!exams.length) {
      res.status(404).json({ message: "No exams found for your department and section" });
      return;
    }

    res.status(200).json({
      message: "Exams fetched successfully",
      exams,
      assignedQuestion: student.assignedQuestion || "No question assigned",
    });
  } catch (error) {
    console.error("Error fetching exam details:", error);
    res.status(500).json({ message: "Error fetching exam details from the database" });
  }
};

export const startExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, time, department, section } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const existingExam = await Exam.findOne({ department, section });

    if (existingExam) {
      res.status(400).json({ message: "An exam is already scheduled for this department and section" });
      return;
    }

    const questions = await parseCSV(file.buffer);

    if (questions.length === 0) {
      res.status(400).json({ message: "No valid questions found in the file" });
      return;
    }

    const questionDocs = questions.map((q: any) => ({
      examName: name,
      department,
      section,
      question: q.question,
    }));

    await Question.insertMany(questionDocs);
    await Exam.create({ name, time, department, section });

    console.log("📂 Questions Saved in database");
    res.json({ message: "Exam started and questions saved successfully." });
  } catch (error) {
    console.error("Error starting exam:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const finishExam = async (req: Request, res: Response): Promise<void> => {
  const { department, section } = req.body;

  if (!department || !section) {
    res.status(400).json({ message: 'Department and Section are required' });
    return;
  }

  try {
    const examResult = await Exam.deleteOne({ department, section });

    if (examResult.deletedCount === 0) {
      res.status(404).json({ message: 'No exam found matching the department and section' });
      return;
    }

    await Question.deleteMany({ department, section });

    console.log('🗑️ Exam data deleted successfully for department:', department, 'and section:', section);
    res.status(200).json({ message: 'Exam data deleted successfully for the department and section' });
  } catch (error) {
    console.error('Error during finish exam:', error);
    res.status(500).json({ message: 'Internal server error!' });
  }
};