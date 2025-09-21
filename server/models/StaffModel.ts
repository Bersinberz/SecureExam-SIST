import mongoose, { Document, Schema, Model } from "mongoose";

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  password: string;
}

const StaffSchema: Schema<IStaff> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  { collection: "staff" }
);

export const Staff: Model<IStaff> = mongoose.model<IStaff>("Staff", StaffSchema);
