import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticatedUser } from './auth.middleware';
import { AdminRole } from '../../shared/enums/admin';

// Re-exported so controllers that need the combined type can import it here
export interface TenantAwareRequest extends Request {
  hotelId?: string;
  user?: AuthenticatedUser;
}

export const tenantMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  // Extract hotelId from header, query, or user token
  const hotelId =
    (req.header('X-Hotel-Id') as string | undefined) ||
    (req.query.hotelId as string | undefined) ||
    req.user?.hotelId;

  const isMendAdmin = req.user?.roles?.includes(AdminRole.MENDADMIN);

  // Normal users (non-MENDADMIN) must only access their own hotel
  if (!isMendAdmin && req.user?.hotelId) {
    req.hotelId = req.user.hotelId;
  } else if (hotelId) {
    // MENDADMIN or public request (if allowed) can use the explicitly provided hotelId
    req.hotelId = hotelId;
  }

  next();
};
