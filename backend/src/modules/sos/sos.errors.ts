// ─────────────────────────────────────────────────────────────────────────────
// modules/sos/sos.errors.ts
//
// Custom error classes for the SOS module.
// ─────────────────────────────────────────────────────────────────────────────

export class SOSError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "SOSError";
  }
}

export const SOSErrors = {
  invalidCoords: () =>
    new SOSError(
      "INVALID_COORDS",
      "Invalid or missing coordinates",
      422
    ),

  sosNotFound: (id: string) =>
    new SOSError(
      "SOS_NOT_FOUND",
      `SOS alert with id ${id} not found`,
      404
    ),

  alreadyResolved: (id: string) =>
    new SOSError(
      "ALREADY_RESOLVED",
      `SOS alert ${id} is already resolved`,
      409
    ),

  unauthorized: () =>
    new SOSError(
      "UNAUTHORIZED",
      "Unauthorized to access this SOS alert",
      403
    ),
};