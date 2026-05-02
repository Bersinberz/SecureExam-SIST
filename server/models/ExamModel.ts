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

// Composite index for the most common query pattern (student login + getExamData)
ExamSchema.index({ department: 1, section: 1, year: 1 });
// Unique constraint: one exam per name+dept+section+year
ExamSchema.index({ examName: 1, department: 1, section: 1, year: 1 }, { unique: true });

export const ExamModel = mongoose.model<IExam>("Exam", ExamSchema);
