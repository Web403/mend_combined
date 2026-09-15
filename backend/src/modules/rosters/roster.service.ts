import { nanoid } from "nanoid";
import { Types } from "mongoose";
import { RosterRepository } from "./roster.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { IdValidatorService } from "../../shared/services/id-validator.service";
import { RosterErrors } from "./roster.error";

const idValidatorService = new IdValidatorService();


export class RosterService {

  async createOrUpdateRosters(hotelId: string, payload: any) {
    const { fromDate, toDate, shiftId, employees } = payload;

    if (!fromDate || !toDate || !shiftId || !Array.isArray(employees)) {
      throw RosterErrors.missingRequiredFields("Missing required roster fields: fromDate, toDate, shiftId, employees array")
    }

    if (employees.length === 0) {
      throw RosterErrors.noEmployeesProvided()
    }

    

    await idValidatorService.validateShiftId(shiftId);
    await idValidatorService.validateEmployeesIds(employees);

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
      throw RosterErrors.dateError()
    }

    // Convert employee string IDs to ObjectIds
    const employeeIds = employees.map((id: string) => new Types.ObjectId(id));
    const createdOrUpdatedRosters = [];

    // Loop through each date
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateToProcess = new Date(currentDate);

      // 1. Resolve conflicts: Remove these employees from ANY existing rosters on this single date
      if (employeeIds.length > 0) {
        await RosterRepository.removeEmployeesFromDate(hotelId, dateToProcess, employeeIds);
      }

      // 2. Add them to the roster for this date and shiftId
      let roster = await RosterRepository.findByDateAndShift(hotelId, dateToProcess, shiftId);

      if (roster) {
        // Roster exists, append new employees that aren't already in it (or replace?)
        // The pull above already removed these employees from this roster, so we can safely add them.
        const currentEmployeeIds = roster.employees.map((eid: any) => eid.toString());
        const idsToAdd = employeeIds.filter(eid => !currentEmployeeIds.includes(eid.toString()));

        roster.employees.push(...idsToAdd as any);
        await roster.save();
      } else {
        // Create new roster for this day
        roster = await RosterRepository.create({
          id: `RST_${nanoid(8)}`,
          hotelId: (hotelId as any),
          date: dateToProcess,
          shiftId,
          employees: employeeIds,
          schemaVersion: 1
        });
      }

      createdOrUpdatedRosters.push(roster);

      // Increment date by 1 day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return createdOrUpdatedRosters;
  }

  async getRosterById(hotelId: string, id: string) {
    const roster = await RosterRepository.findById(hotelId, id);

    if (!roster) {
      throw RosterErrors.rosterNotFound()
    }

    return roster;
  }

  async getRostersAndShiftsByUserId(hotelId:string,userId:string) {

    const todaysDate = new Date()

    // lets find date that was 2 days ago
    const twoDaysAgoDate = new Date()
    twoDaysAgoDate.setDate(todaysDate.getDate() -2);

    const rosters = await RosterRepository.findByUser(hotelId,userId,twoDaysAgoDate);

    if(rosters.length == 0) {
      throw RosterErrors.rosterNotFound();
    } 

    return rosters;
    
  }

  async getAllRosters(hotelId: string) {
    return RosterRepository.findAllByTenant(hotelId);
  }

  async getShiftRosters(hotelId: string, shiftId: string) {
    return RosterRepository.findByShift(hotelId, shiftId)
  }

  async updateRoster(hotelId: string, id: string, payload: any) {
    const roster = await RosterRepository.update(hotelId, id, payload);

    if (!roster) {
      throw RosterErrors.rosterNotFound()
    }

    return roster;
  }

  async deleteRoster(hotelId: string, id: string) {
    const roster = await RosterRepository.delete(hotelId, id);

    if (!roster) {
      throw RosterErrors.rosterNotFound()
    }

    return { message: "Roster deleted successfully" };
  }

  async removeEmployeeFromRoster(id:string, employeeId : string) {

    const roster = await RosterRepository.removeEmployee(id,employeeId)

    if (!roster) {
      throw RosterErrors.rosterNotFound()
    }

    return roster;

  }

}
