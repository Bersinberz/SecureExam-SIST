import mongoose, { Schema, Document } from "mongoose";

export interface IExam extends Document {
  examName: string;
  examTime: number;
  department: string;
  section: string;
  year: string;
  questions: string[];
  createdBy: string;
  createdAt: Date;
  parseWarnings?: string[];
}

const ExamSchema = new Schema<IExam>({
  examName: { type: String, required: true },
  examTime: { type: Number, required: true },
  department: { type: String, required: true },
  section: { type: String, required: true },
  year: { type: String, required: true },
  questions: [{ type: String, required: true }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  parseWarnings: [{ type: String }]
});

export const ExamModel = mongoose.model<IExam>("Exam", ExamSchema);
