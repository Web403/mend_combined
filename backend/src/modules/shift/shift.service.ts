import { nanoid } from "nanoid";
import { ShiftRepository } from "./shift.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { ShiftStatus } from "../../shared/enums";
import { ShiftErrors } from "./shift.error";

export class ShiftService {

  async createShift(hotelId: string, payload: any) {
    const { startTime, endTime, employees } = payload;

    if (!startTime || !endTime) {
      throw ShiftErrors.missingRequiredFields("Missing required shift fields: startTime and endTime")
    }

    if (new Date(endTime) <= new Date(startTime)) {
      throw ShiftErrors.shiftTimeError()
    }

    const shiftExist = await ShiftRepository.checkShift(hotelId, startTime, endTime);

    if (shiftExist) {
      throw ShiftErrors.shiftAlreadyExists()
    }

    return ShiftRepository.create({
      id: `SHF_${nanoid(8)}`,
      hotelId,
      startTime,
      endTime,
      employees,
      schemaVersion: 1
    });
  }

  async getShiftById(hotelId: string, id: string) {
    const shift = await ShiftRepository.findById(hotelId, id);

    if (!shift) {
      throw ShiftErrors.shiftNotFound()
    }

    return shift;
  }

  async getAllShifts(hotelId: string) {
    return ShiftRepository.findAllByTenant(hotelId);
  }

  async getUserShifts(hotelId: string, userId: string) {
    return ShiftRepository.findByUser(hotelId, userId);
  }

  async updateShift(hotelId: string, id: string, payload: any) {
    const shift = await ShiftRepository.update(hotelId, id, payload);

    if (!shift) {
      throw ShiftErrors.shiftNotFound()
    }

    return shift;
  }

  async deleteShift(hotelId: string, id: string) {
    const shift = await ShiftRepository.delete(hotelId, id);

    if (!shift) {
      throw ShiftErrors.shiftNotFound()
    }

    return { message: "Shift deleted successfully" };
  }
};