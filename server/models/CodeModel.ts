import mongoose, { Schema, Document } from 'mongoose';

export interface ICode extends Document {
  registerNumber: number;
  language: string;
  code: string;
  assignedQuestion: string;
  submittedAt: Date;
}

const CodeSchema: Schema = new Schema({
  registerNumber: { type: Number, required: true },
  language: { type: String, required: true },
  code: { type: String, required: true },
  assignedQuestion: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
}, { collection: 'code' });

export const Code = mongoose.model<ICode>('Code', CodeSchema);