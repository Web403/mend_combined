import { AttendanceModel } from "../modules/attendance/attendance.model";
import { createBaseFields } from "./utils";

export const seedAttendance = async (
  hotelId: string,
  userId: string
) => {
  await AttendanceModel.create({
    ...createBaseFields(hotelId, "ATT"),
    userId,
    clockIn: new Date(Date.now() - 8 * 60 * 60 * 1000),
    clockOut: new Date(),
    workDurationMinutes: 480,
    recoveryMinutes: 900,
    geoValidated: true,
    violationFlags: {
      exceeds10Hours: false,
      insufficientRecovery: false
    }
  });

  console.log("⏱ Attendance seeded");
};