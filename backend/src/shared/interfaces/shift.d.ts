import { ShiftStatus } from "../enums";

export interface IShift {
  id: string;
  hotelId: mongoose.types.ObjectId;
  date: Date;

  startTime: Date;
  endTime: Date;


  employees?: mongoose.Types.ObjectId[]; // list of user IDs assigned to this shift

  actualAttendanceId?: string; // link to attendance

  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
