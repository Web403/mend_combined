import { nanoid } from "nanoid";
import { Types } from "mongoose";
import { RosterRepository } from "./roster.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { IdValidatorService } from "../../shared/services/id-validator.service";
import { RosterErrors } from "./roster.error";
import { IRoster } from "../../shared/interfaces/roster";
import {
  AvailabilityConflict,
  LeaveAvailabilityService,
  leaveAvailabilityService,
} from "../leave/leave-availability.service";
import { utcMidnight } from "../leave/leave.date";

const idValidatorService = new IdValidatorService();

/**
 * A reason an assigned employee may not be working that day: a scheduled off, or
 * leave (approved or still pending). Warnings never block the assignment. The
 * manager decides, and the response tells them what they are overriding.
 */
export type RosterWarning = AvailabilityConflict;

export interface RosterWriteResult<T> {
  rosters: T[];
  warnings: RosterWarning[];
}

/** Roster fields a client may set. Anything else in the body (`hotelId`, `_id`, ...) is ignored. */
const UPDATABLE_ROSTER_FIELDS = ["date", "shiftId", "employees"] as const;

/** Parses a client date into a UTC-midnight calendar date, or null if it is not a valid date. */
function toCalendarDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const instant = new Date(value as string | number | Date);
  return Number.isNaN(instant.getTime()) ? null : utcMidnight(instant);
}

const KIND_ORDER: Record<RosterWarning["kind"], number> = {
  DAY_OFF: 0,
  APPROVED_LEAVE: 1,
  PENDING_LEAVE: 2,
};

function compareWarnings(a: RosterWarning, b: RosterWarning): number {
  return (
    a.date.localeCompare(b.date) ||
    a.employeeId.localeCompare(b.employeeId) ||
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  );
}

export class RosterService {
  constructor(
    private readonly availability: Pick<LeaveAvailabilityService, "findConflicts"> = leaveAvailabilityService,
  ) {}

  async createOrUpdateRosters(hotelId: string, payload: any): Promise<RosterWriteResult<IRoster>> {
    const { fromDate, toDate, shiftId, employees } = payload;

    if (!fromDate || !toDate || !shiftId || !Array.isArray(employees)) {
      throw RosterErrors.missingRequiredFields("Missing required roster fields: fromDate, toDate, shiftId, employees array")
    }

    if (employees.length === 0) {
      throw RosterErrors.noEmployeesProvided()
    }

    await idValidatorService.validateShiftId(shiftId);
    await idValidatorService.validateEmployeesIds(employees);

    // Rosters are per calendar day. Normalise to UTC midnight so a timestamp with a
    // time part, or a local-midnight date, still matches the same day's roster.
    const start = toCalendarDate(fromDate);
    const end = toCalendarDate(toDate);
    if (!start || !end) {
      throw RosterErrors.invalidDate();
    }
    if (end < start) {
      throw RosterErrors.dateError()
    }

    // Convert employee string IDs to ObjectIds
    const employeeIds = employees.map((id: string) => new Types.ObjectId(id));

    // Warnings describe the assignment as requested, so they are computed before anything is written.
    const warnings = await this.warningsFor(hotelId, employeeIds.map(String), start, end);
    const rosterIds: Types.ObjectId[] = [];

    // Loop through each calendar day. UTC keeps the step at exactly one day.
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateToProcess = new Date(cursor);

      // 1. Resolve conflicts: Remove these employees from ANY existing rosters on this single date
      await RosterRepository.removeEmployeesFromDate(hotelId, dateToProcess, employeeIds);

      // 2. Add them to the roster for this date and shiftId
      const roster = await RosterRepository.findByDateAndShift(hotelId, dateToProcess, shiftId);

      if (roster) {
        // The pull above already removed these employees from this roster, so only ids
        // that are still missing (a concurrent write) need adding.
        const currentEmployeeIds = new Set(roster.employees.map((eid: any) => eid.toString()));
        const idsToAdd = employeeIds.filter((eid) => !currentEmployeeIds.has(eid.toString()));
        if (idsToAdd.length > 0) {
          await RosterRepository.addEmployees(hotelId, roster._id, idsToAdd);
        }
        rosterIds.push(roster._id);
      } else {
        // Create new roster for this day
        const created = await RosterRepository.create({
          id: `RST_${nanoid(8)}`,
          hotelId: new Types.ObjectId(hotelId),
          date: dateToProcess,
          shiftId,
          employees: employeeIds,
          schemaVersion: 1
        });
        rosterIds.push(created._id);
      }

      // Increment date by 1 day
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Re-read so the response shows what is stored, not what was intended.
    const rosters = await RosterRepository.findByIdsInHotel(hotelId, rosterIds);
    return { rosters, warnings };
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

  async updateRoster(hotelId: string, id: string, payload: any): Promise<RosterWriteResult<IRoster>> {
    const update: Partial<Record<(typeof UPDATABLE_ROSTER_FIELDS)[number], unknown>> = {};
    for (const field of UPDATABLE_ROSTER_FIELDS) {
      if (payload?.[field] !== undefined) update[field] = payload[field];
    }

    if (update.date !== undefined) {
      const date = toCalendarDate(update.date);
      if (!date) throw RosterErrors.invalidDate();
      update.date = date;
    }
    if (update.shiftId !== undefined) {
      await idValidatorService.validateShiftId(update.shiftId as string);
    }
    if (update.employees !== undefined) {
      if (!Array.isArray(update.employees)) throw RosterErrors.missingRequiredFields("employees must be an array");
      await idValidatorService.validateEmployeesIds(update.employees as string[]);
    }

    const roster = await RosterRepository.update(hotelId, id, update as Partial<IRoster>);

    if (!roster) {
      throw RosterErrors.rosterNotFound()
    }

    // Check the roster as stored, since the date or the employee list may have changed.
    const employeeIds = roster.employees
      .filter((employee: any) => employee != null) // a populated employee who was deleted is null
      .map((employee: any) => String(employee._id ?? employee));
    const day = utcMidnight(roster.date);
    const warnings = await this.warningsFor(hotelId, employeeIds, day, day);

    return { rosters: [roster], warnings };
  }

  /** Leave and off conflicts for these employees across [from, to], in date order. */
  private async warningsFor(
    hotelId: string,
    employeeIds: string[],
    from: Date,
    to: Date,
  ): Promise<RosterWarning[]> {
    const conflicts = await this.availability.findConflicts(hotelId, employeeIds, from, to);
    return [...conflicts.values()].flat().sort(compareWarnings);
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
