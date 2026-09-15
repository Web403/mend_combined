export class RosterError extends Error {
    constructor(public readonly code:string,
        message:string,
        public readonly httpStatus: number = 400,
    ) {
        
        super(message);
        this.name = "RosterError"

    }
}

export const RosterErrors = {
    rosterNotFound:() => new RosterError("ROSTER_NOT_FOUND","Unable to find the reqeusted roster",404),
    missingRequiredFields:(reason:string) => new RosterError("MISSING_REQUIRED_FIELDS",reason,400),
    noEmployeesProvided:() => new RosterError("EMPLOYEE_DATA_ERROR","No employees provided",400),
    dateError:() => new RosterError("INVALID_DATE","toDate cannot be before fromDate",400)
} as const