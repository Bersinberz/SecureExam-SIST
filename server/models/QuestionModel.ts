import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  examName: string;
  department: string;
  section: string;
  question: string;
}

const QuestionSchema: Schema = new Schema({
  examName: { type: String, required: true },
  department: { type: String, required: true },
  section: { type: String, required: true },
  question: { type: String, required: true }
}, { collection: 'exam_questions' });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);