import mongoose, { Document, Schema, Model } from "mongoose";

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  registerNumber: number;
  userName: string;
  department: string;
  section: string;
  year: string;
  password: string;
}

const StudentSchema: Schema<IStudent> = new Schema(
  {
    registerNumber: { type: Number, required: true, unique: true },
    userName: { type: String, required: true },
    department: { type: String, required: true },
    section: { type: String, required: true },
    year: {type: String, required: true},
    password: { type: String, required: true },
  },
  { collection: "student" }
);

export const Student: Model<IStudent> = mongoose.model<IStudent>(
  "Student",
  StudentSchema
);
