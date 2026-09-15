import { Types } from "mongoose";

export interface IBaseDocument {
  _id: Types.ObjectId;
  id: string;
  hotelId: Types.ObjectId;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}