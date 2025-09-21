import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
  name: string;
  time: string;
  department: string;
  section: string;
  file?: string;
}

const ExamSchema: Schema = new Schema({
  name: { type: String, required: true },
  time: { type: String, required: true },
  department: { type: String, required: true },
  section: { type: String, required: true },
  file: { type: String }
}, { collection: 'exams' });

export const Exam = mongoose.model<IExam>('Exam', ExamSchema);