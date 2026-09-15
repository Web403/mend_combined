// ─────────────────────────────────────────────────────────────────────────────
// core/middleware/flex-auth.middleware.ts
//
// flexAuth  — accepts any valid JWT (MENDADMIN or hotel user).
//             Populates req.admin (MENDADMIN) or req.user + runs
//             tenantMiddleware (hotel users).
//
// adminOnly — must run after flexAuth.
//             Allows only MENDADMIN or hotel-level admins (UserRole.ADMIN).
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { verifyToken } from '../utils/jwt.helper';
import { tenantMiddleware } from './tenant.middleware';
import { AdminRole } from '../../shared/enums/admin';
import { UserRole } from '../../shared/enums/user';

export function flexAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'Authorization header missing' });
    return;
  }

  verifyToken(token, env.JWT_SECRET)
    .then((payload: any) => {
      const roles: string[] = payload.roles || [];
      if (roles.includes(AdminRole.MENDADMIN)) {
        (req as any).admin = { id: payload.sub, roles, hotelId: payload.hotelId };
        next();
      } else {
        (req as any).user = { id: payload.sub, roles, hotelId: payload.hotelId };
        tenantMiddleware(req as any, res, next);
      }
    })
    .catch(() => {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
    });
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const r = req as any;
  const isMendAdmin = r.admin?.roles?.includes(AdminRole.MENDADMIN);
  const isHotelAdmin = r.user?.roles?.includes(UserRole.ADMIN);

  if (isMendAdmin || isHotelAdmin) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Admin access required' });
}
