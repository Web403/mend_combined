import bcrypt from "bcryptjs";
import { AdminModel } from "./admin.model";
import { SessionModel } from "../auth/session.model";
import { ISession } from "../../shared/interfaces";

export class AdminRepository {
  async findByEmail(email: string) {
    return AdminModel.findOne({ email });
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async saveRefreshToken(
    session: Pick<ISession, "id" | "userId" | "hotelId" | "hashedRefreshToken" | "expiresAt">
  ) {
    return SessionModel.create(session);
  }
}
