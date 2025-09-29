import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface ExamDetails {
    name: string;
    time: number;
    department: string;
    section: string;
    year: string;
    file?: Express.Multer.File;
}

export const createExam = async (req: Request, res: Response) => {
    try {
        const { name, time, department, section, year } = req.body;
        const file = req.file;

        if (!name || !time || !department || !section || !year || !file) {
            return res.status(400).json({ message: 'All fields are required including file.' });
        }

        // Create a folder to store uploaded files if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        // Move file to uploads folder (multer can already handle this, but just in case)
        const filePath = path.join(uploadDir, file.originalname);
        fs.renameSync(file.path, filePath);

        // Here you can save exam details to your database
        const examId = Date.now().toString(); // Example ID, replace with DB-generated ID

        return res.status(201).json({
            message: 'Exam created successfully!',
            examId,
            data: {
                name,
                time,
                department,
                section,
                year,
                filePath,
            },
        });
    } catch (error: any) {
        console.error('Create exam error:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
