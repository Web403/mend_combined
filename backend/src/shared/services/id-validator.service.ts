import { AppError } from "../../core/middleware/error.middleware";
import { GigModel } from "../../modules/gigs/gig.model";
import { HotelModel } from "../../modules/hotel/hotel.model";
import { ShiftModel } from "../../modules/shift/shift.model";
import { UserModel } from "../../modules/users/user.model";
import { UserRole } from "../enums";
import { AuthRole } from "../enums/common";

export class IdValidatorService {
  async validateShiftId(shiftId: string) {
    const shift = await ShiftModel.findById(shiftId);
    if (!shift) {
      throw new AppError("Shift not found", 404);
    }
    return shift;
  }

  async validateEmployeeId(employeeId: string) {
    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }
    return employee;
  }

  async validateEmployeesIds(employeesIds: string[]) {
    const employees = await UserModel.find({
      _id: { $in: employeesIds },
    }).lean();

    if (employees.length !== employeesIds.length) {
      const foundIds = employees.map((emp) => emp._id.toString());
      const missing = employeesIds.filter((id) => !foundIds.includes(id));

      throw new AppError(`Employees not found: ${missing.join(", ")}`, 404);
    }
    return employees;
  }

  async validateHotelId(hotelId: string) {
    if (!hotelId) {
      throw new AppError(`Hotel id is required`, 400);
    }

    const hotel = await HotelModel.findById(hotelId);
    if (!hotel) {
      throw new AppError(`Hotel is invalid`, 400);
    }
    return hotel;
  }

  async validateGigSecondaryId(gigId: string) {
    if (!gigId) {
      throw new AppError(`Gig id is required`, 400);
    }
    const gig = await GigModel.findOne({ id: gigId }); 
    if(!gig) {
        throw new AppError(`Gig is invalid`,400)
    }
    return gig
  }
}
