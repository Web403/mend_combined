import { ShiftModel } from "./shift.model";
import { IShift } from "../../shared/interfaces";

export const ShiftRepository = {
  create: (data: Partial<IShift>) => {
    return ShiftModel.create(data);
  },

  findById: (hotelId: string, id: string) => {
    return ShiftModel.findOne({ hotelId, _id: id });
  },

  findAllByTenant: (hotelId: string) => {
    // populate the employees array (and if each item has an `employee` ref, populate that too)
    return ShiftModel.find({ hotelId })
      .sort({ date: 1 })
      .populate({ path: "employees", select: "profile.firstName profile.lastName" })
  },

  findByUser: (hotelId: string, userId: string) => {
    return ShiftModel.find({ hotelId, userId }).sort({ date: 1 });
  },

  update: (hotelId: string, id: string, data: Partial<IShift>) => {
    return ShiftModel.findByIdAndUpdate(id, { ...data }, { new: true }
    );
  },

  checkShift: (hotelId: string, startTime: string, endTime: string) => {
    return ShiftModel.findOne({ hotelId, startTime, endTime })
  },

  delete: (hotelId: string, id: string) => {
    return ShiftModel.findByIdAndDelete(id)
  }
};