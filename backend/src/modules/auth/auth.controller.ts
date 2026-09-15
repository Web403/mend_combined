import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse, errorResponse } from '../../core/utils/ApiResponse';

const service = new AuthService();

export class AuthController {

  async register(req: Request, res: Response) {
    const { email, password, hotelId, profile } = req.body;
    const user = await service.register(email, password, profile, hotelId);
    res.json(successResponse(user, 'User created'));
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      const tokens = await service.login(email, password);
      res.json(successResponse(tokens));
    } catch (error: any) {
      res.json(errorResponse(error.message));
    }
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const data = await service.refreshToken(refreshToken);
    res.json(successResponse(data));
  }

  async logout(req: Request, res: Response) {
    const { sessionId } = req.body;
    await service.logout(sessionId);
    res.json(successResponse(null, 'Logged out'));
  }
}