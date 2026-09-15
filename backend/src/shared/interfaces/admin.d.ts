export interface IAdmin extends IBaseDocument {
  hotelId?: string; // undefined for MENDADMIN (system-level, not hotel-scoped)

  email: string;
  phone: string;
  passwordHash: string;

  role: AdminRole;
  status: AdminStatus;

  profile: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };

  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;

  mfaEnabled: boolean;
  mfaSecret?: string;
}