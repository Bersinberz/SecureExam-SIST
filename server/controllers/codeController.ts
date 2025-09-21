import { Request, Response } from 'express';
import { Code } from '../models/CodeModel';

export const submitCode = async (req: Request, res: Response): Promise<void> => {
  try {
    let { registerNumber, language, code, assignedQuestion } = req.body;

    if (!registerNumber || !language || !code || !assignedQuestion) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    registerNumber = parseInt(registerNumber, 10);

    if (isNaN(registerNumber)) {
      res.status(400).json({ message: 'Invalid register number format' });
      return;
    }

    const result = await Code.create({
      registerNumber,
      language,
      code,
      assignedQuestion,
      submittedAt: new Date()
    });

    if (result) {
      console.log("📝", registerNumber, "has completed and submitted the exam");
      res.json({ message: 'Code saved successfully' });
    } else {
      res.status(500).json({ message: 'Failed to save code' });
    }
  } catch (error) {
    console.error('Error saving code:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const codeDocuments = await Code.find({});

    if (!codeDocuments || codeDocuments.length === 0) {
      res.status(404).json({ message: "No code submissions found" });
      return;
    }

    res.json(codeDocuments);
  } catch (error) {
    console.error("Error fetching code submissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};