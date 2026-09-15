import { nanoid } from "nanoid";
import { AuthRepository } from "./auth.repository";
import { env } from "../../config/env";
import bcrypt from "bcryptjs";
import ms, { StringValue } from "ms";
import { UserRole } from "../../shared/enums";
import { signToken, verifyToken } from "../../core/utils/jwt.helper";
import { logger } from "../../core/utils/logger";
import { IUser } from "../../shared/interfaces";
import { UserProfile } from "../../shared/interfaces/user";

export class AuthService {
  private repo = new AuthRepository();

  async register(
    email: string,
    password: string,
    profile: UserProfile,
    hotelId?: string,
  ) {
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new Error("Email already in use");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.repo.createUser({
      id: `user_${nanoid(8)}`,
      email,
      passwordHash,
      role: UserRole.EMPLOYEE,
      hotelId: hotelId || `tenant_${nanoid(8)}`,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        dob: profile.dob,
        location: {
          street: profile.location?.street,
          country: profile.location?.country,
          city: profile.location?.city,
          state: profile.location?.state,
          pincode: profile.location?.pinCode,
        },
      },
    } as any);

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.repo.findUserByEmail(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }
    const ok = await this.repo.comparePassword(password, user.passwordHash);
    if (!ok) {
      throw new Error("Invalid credentials");
    }

    const accessToken = signToken(
      {
        sub: user._id,
        roles: [user.role],
        departmentType: user.departmentType,
        departmentRole: user.departmentRole,
        hotelId: user.hotelId,
      },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN as StringValue,
    );

    const refreshToken = signToken(
      { sub: user._id },
      env.REFRESH_TOKEN_SECRET,
      env.REFRESH_TOKEN_EXPIRES_IN as StringValue,
    );

    const createdSession = await this.repo.saveRefreshToken({
      id: `sess_${nanoid(8)}`,
      userId: (user._id as any).toString(),
      hotelId: user.hotelId ? (user.hotelId as any).toString() : null,
      hashedRefreshToken: await bcrypt.hash(refreshToken, 10),
      expiresAt: new Date(
        Date.now() + ms(env.REFRESH_TOKEN_EXPIRES_IN as StringValue),
      ),
    });

    let username = user.profile.firstName + " " + user.profile.lastName;

    return {
      accessToken,
      refreshToken,
      role: user.role,
      username,
      email: user.email,
      phone: user.phone,
      userId: user.id,
      hotelId: user.hotelId,
      userSecretId: user._id,
    };
  }

  async refreshToken(token: string) {
    const payload = await verifyToken(token, env.REFRESH_TOKEN_SECRET);
    const session = await this.repo.findSessionByUserId(payload.sub);
    if (!session) {
      throw new Error("Invalid refresh token");
    }

    const user = await this.repo.findUserById(session.userId);
    if (!user) {
      throw new Error("Invalid refresh token");
    }

    // you could compare hashed token too
    const newAccess = signToken(
      {
        sub: session.userId,
        hotelId: session.hotelId,
        roles: [user.role],
        departmentType: user.departmentType,
        departmentRole: user.departmentRole,
      },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN as StringValue,
    );
    return { accessToken: newAccess };
  }

  async logout(sessionId: string) {
    return this.repo.invalidateRefreshToken(sessionId);
  }
}
