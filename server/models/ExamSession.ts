import mongoose, { Schema, Document } from "mongoose";

export interface IExamSession extends Document {
  studentId:      string;
  registerNumber: string;
  examId:         string;
  startedAt:      Date;
  expiresAt:      Date;
  submitted:      boolean;
}

const ExamSessionSchema = new Schema<IExamSession>({
  studentId:      { type: String, required: true },
  registerNumber: { type: String, required: true },
  examId:         { type: String, required: true },
  startedAt:      { type: Date,   default: Date.now },
  expiresAt:      { type: Date,   required: true },
  submitted:      { type: Boolean, default: false },
}, { timestamps: false });

ExamSessionSchema.index({ studentId: 1, examId: 1 }, { unique: true });
// TTL index — MongoDB auto-deletes sessions 1 hour after they expire
ExamSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const ExamSession = mongoose.model<IExamSession>("ExamSession", ExamSessionSchema);
