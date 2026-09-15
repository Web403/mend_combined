import bcrypt from 'bcryptjs';
import { UserModel } from '../users/user.model';
import { SessionModel } from './session.model';
import { ISession, IUser } from '../../shared/interfaces';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return UserModel.findOne({ email });
  }

  async findUserById(userId: string) {
    return UserModel.findOne({ _id: userId });
  }

  async createUser(user: Partial<IUser>) {
    return UserModel.create(user);
  }

  async comparePassword(
    plain: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async saveRefreshToken(
    session: Pick<ISession, 'id' | 'userId' | 'hotelId' | 'hashedRefreshToken' | 'expiresAt'>
  ) {
    return SessionModel.create(session);
  }

  async invalidateRefreshToken(sessionId: string) {
    return SessionModel.deleteOne({ id: sessionId });
  }

  async findSession(sessionId: string) {
    return SessionModel.findOne({ id: sessionId });
  }

  async findSessionByUserId(userId: string) {
    return SessionModel.findOne({ userId }).sort({createdAt: -1});
  }
}
