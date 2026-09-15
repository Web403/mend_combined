// ─────────────────────────────────────────────────────────────────────────────
// core/middleware/admin.middleware.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { verifyToken } from '../utils/jwt.helper';
import { AdminRole } from '../../shared/enums/admin';

export interface AuthenticatedAdmin {
  id: string;
  roles: string[];
  hotelId?: string;
}

export interface AdminAuthenticatedRequest extends Request {
  admin?: AuthenticatedAdmin;
}

export const adminAuthMiddleware = (
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const header = req.header('Authorization')?.split(' ')[1];
  if (!header) {
    res.status(401).json({ success: false, message: 'Authorization header missing' });
    return;
  }

  verifyToken(header, env.JWT_SECRET)
    .then((payload: any) => {
      const roles = payload.roles || [];
      if (!roles.includes(AdminRole.MENDADMIN)) {
        res.status(403).json({ success: false, message: 'Admin access required' });
        return;
      }
      req.admin = { id: payload.sub, roles, hotelId: payload.hotelId };
      next();
    })
    .catch(() => {
      res.status(401).json({ success: false, message: 'Invalid token' });
    });
};
