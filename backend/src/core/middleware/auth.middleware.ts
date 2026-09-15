import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { verifyToken } from '../utils/jwt.helper';
import { logger } from '../utils/logger';
import { AppError } from './error.middleware';
import { UserModel } from '../../modules/users/user.model';

export interface AuthenticatedUser {
  id: string;
  roles: string[];
  departmentType?: string;
  departmentRole?: string;
  hotelId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  hotelId?: string;
  file?: any;
  files?: any;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const header = req.header('Authorization')?.split(' ')[1];
  if (!header) {
    res.status(401).json({ success: false, message: 'Authorization header missing' });
    return;
  }

  verifyToken(header, env.JWT_SECRET)
    .then(async (payload: any) => {
      req.user = {
        id: payload.sub,
        roles: payload.roles || [],
        departmentType: payload.departmentType,
        departmentRole: payload.departmentRole,
        hotelId: payload.hotelId,
      };

      // Fallback: If departmentType or departmentRole are missing from the JWT (e.g. older tokens),
      // fetch them from the database to ensure we can still authorize them.
      if (payload.sub && (!payload.departmentType || !payload.departmentRole)) {
        try {
          const user = await UserModel.findById(payload.sub).select('role departmentType departmentRole');
          if (user) {
            req.user.roles = [user.role];
            req.user.departmentType = user.departmentType;
            req.user.departmentRole = user.departmentRole;
          }
        } catch (dbErr) {
          logger.error('Failed to fetch user department details from DB in auth middleware', { error: dbErr });
        }
      }
      next();
    })
    .catch((err: any) => {
      logger.error('JWT verification failed', { error: err });
      next(new AppError('Invalid or expired token', 401));
    });
};