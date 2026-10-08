import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { AuthRole } from "../../shared/enums/common";
import { UserRole } from "../../shared/enums/user";

const ORGANIZER_ROLES = [
  AuthRole.HOTEL, // Existing hotel / business account
  UserRole.CATERER_EVENT_MANAGER,
  UserRole.MANAGER, // Existing manager accounts remain compatible
];

export function isGigOrganizerRole(roles: string[] = []): boolean {
  return roles.some((role) => ORGANIZER_ROLES.includes(role as any));
}

/**
 * Resolves the gig tenant from the authenticated identity, never from an
 * arbitrary X-Hotel-Id header. Hotel accounts own their tenant directly;
 * caterer/event-manager user accounts must be attached to a hotel tenant.
 */
export const gigOrganizerMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const roles = req.user?.roles ?? [];
  if (!req.user || !isGigOrganizerRole(roles)) {
    res.status(403).json({
      success: false,
      message: "Only caterer/event-manager accounts can manage gigs.",
    });
    return;
  }

  const isHotelAccount = roles.includes(AuthRole.HOTEL);
  const hotelId = isHotelAccount ? req.user.id : req.user.hotelId;
  if (!hotelId) {
    res.status(403).json({
      success: false,
      message: "A hotel / caterer tenant is required for gig management.",
    });
    return;
  }

  req.hotelId = String(hotelId);
  (req as any).gigIsHotelAccount = isHotelAccount;
  next();
};

export function isGigHotelAccount(req: AuthenticatedRequest): boolean {
  return (req.user?.roles ?? []).includes(AuthRole.HOTEL);
}

export function getGigOrganizerHotelId(req: AuthenticatedRequest): string | undefined {
  const roles = req.user?.roles ?? [];
  if (!isGigOrganizerRole(roles)) return undefined;
  return isGigHotelAccount(req) ? req.user?.id : req.user?.hotelId;
}
