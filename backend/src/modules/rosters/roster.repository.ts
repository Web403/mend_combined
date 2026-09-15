import { Types } from "mongoose";
import { RosterModel } from "./roster.model";
import { IRoster } from "../../shared/interfaces/roster";

export const RosterRepository = {
  create: (data: Partial<IRoster>) => {
    return RosterModel.create(data);
  },

  findById: (hotelId: string, id: string) => {
    return RosterModel.findOne({ hotelId, id });
  },

  findAllByTenant: (hotelId: string) => {
    return RosterModel.find({ hotelId }).sort({ date: 1 }).populate("employees", "_id profile.firstName profile.lastName departmentRole");
  },

  findByShift: (hotelId: string, shiftId: string) => {
    return RosterModel.find({ hotelId, shiftId }).sort({ date: 1 }).populate("employees", "_id profile.firstName profle.lastName profile.email").populate("shiftId","_id startTime endTime")
  },

  findByUser: (hotelId:string,userId : string, fromDate?: Date) => {
    return RosterModel.find({hotelId, employees:userId, date: {$gte:fromDate}}).sort({date:1}).populate("shiftId","_id startTime endTime").select("-employees")
  },

  findByDateRange: (hotelId: string, fromDate: Date, toDate: Date) => {
    return RosterModel.findOne({
      hotelId,
      date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: 1 });
  },

  // Finds a unique roster for a given date and shift
  findByDateAndShift: (hotelId: string, date: Date, shiftId: string) => {
    return RosterModel.findOne({ hotelId, date, shiftId });
  },

  // Pulls specified employees from any roster on a given date (to handle conflict resolution)
  removeEmployeesFromDate: (hotelId: string, date: Date, employeeIds: Types.ObjectId[]) => {
    return RosterModel.updateMany(
      { hotelId, date },
      { $pull: { employees: { $in: employeeIds } } }
    );
  },

  update: (hotelId: string, id: string, data: Partial<IRoster>) => {
    return RosterModel.findOneAndUpdate(
      { hotelId, _id: id },
      data,
      { new: true }
    ).populate("employees", "_id profile.firstName profile.lastName");
  },

  delete: (hotelId: string, id: string) => {
    return RosterModel.findOneAndDelete({ hotelId, _id: id });
  },

  removeEmployee: (id:string, employeeId:string) => {
    return RosterModel.findByIdAndUpdate(id,{
      $pull : {employees : employeeId}
    },{new:true})
  }
};
