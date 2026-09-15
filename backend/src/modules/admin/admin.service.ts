import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import ms, { StringValue } from "ms";
import { env } from "../../config/env";
import { AdminRepository } from "./admin.repository";
import { signToken } from "../../core/utils/jwt.helper";

export class AdminService {
  private repo = new AdminRepository();

  async login(email: string, password: string) {
    const admin = await this.repo.findByEmail(email);
    if (!admin) {
      throw new Error("Invalid credentials");
    }

    if (admin.status !== "ACTIVE") {
      throw new Error("Account is not active");
    }

    const valid = await this.repo.comparePassword(password, admin.passwordHash);
    // if (!valid) {
    //   throw new Error("Invalid credentials");
    // }

    const accessToken = signToken(
      {
        sub: admin.id,
        roles: [admin.role],
        ...(admin.hotelId ? { hotelId: admin.hotelId } : {})
      },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN as StringValue
    );

    const refreshToken = signToken(
      { sub: admin.id },
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_EXPIRES_IN as StringValue
    );

    await this.repo.saveRefreshToken({
      id: `sess_${nanoid(8)}`,
      userId: admin.id,
      hotelId: admin.hotelId ?? "system", // sessions table requires a value; use sentinel for MENDADMIN
      hashedRefreshToken: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(Date.now() + ms(env.REFRESH_TOKEN_EXPIRES_IN as StringValue))
    });

    return { accessToken, refreshToken };
  }
}
