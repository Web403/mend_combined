import mongoose from "mongoose";

export interface IRoster {
  id: string; // nanoid
  hotelId: mongoose.Types.ObjectId;
  date: Date;
  shiftId: mongoose.Types.ObjectId;
  employees: mongoose.Types.ObjectId[];
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
