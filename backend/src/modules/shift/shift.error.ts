export class ShiftError extends Error {
    constructor(public readonly code:string,
        message:string,
        public readonly httpStatus: number = 400,
    ) {
        
        super(message);
        this.name = "ShiftError"

    }
}

export const ShiftErrors = {
    shiftNotFound:() => new ShiftError("SHIFT_NOT_FOUND","Unable to find the reqeusted roster",404),
    shiftAlreadyExists: () => new ShiftError("SHIFT_EXISTS","Shift already exist",400),
    missingRequiredFields:(reason:string) => new ShiftError("MISSING_REQUIRED_FIELDS",reason,400),
    noEmployeeFound:() => new ShiftError("EMPLOYEE_NOT_FOUND","No employee found",400),
    shiftTimeError:() => new ShiftError("INVALID_SHIFT_TIME","Invalid shift time range",400)
} as const