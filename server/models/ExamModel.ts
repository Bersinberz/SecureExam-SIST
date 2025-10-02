import mongoose, { Schema, Document } from "mongoose";

export interface IExam extends Document {
  examName: string;
  examTime: number;
  department: string;
  section: string;
  year: string;
  questions: string[];
}

const ExamSchema = new Schema<IExam>({
  examName: { type: String, required: true },
  examTime: { type: Number, required: true },
  department: { type: String, required: true },
  section: { type: String, required: true },
  year: { type: String, required: true },
  questions: { type: [String], required: true }, // array of questions
});

export const ExamModel = mongoose.model<IExam>("Exam", ExamSchema);
