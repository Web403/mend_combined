import { IBaseDocument } from "../../shared/interfaces/base.types";
import { UserRole } from "../../shared/constants";
import {
  IdType,
  UserAvailability,
  UserProfession,
  UserStatus,
  YearsOfExperience,
} from "../enums";
import { AuthRole } from "../enums/common";
import { UserDepartmentRole, UserDepartmentType } from "../enums/user";

export interface IUser extends IBaseDocument {
  email: string;
  phone?: string;
  hotelId?: string;
  whatsappNumber?: string;
  passwordHash: string;
  password?: string;
  role: UserRole;
  authRole: AuthRole.USER;
  paymentId?: string;
  subscriptionAmount?: number;
  profession?: UserProfession;
  availability?: UserAvailability;
  previousVenues?: string[];
  idType?: IdType;
  idNumber?: string;
  yearsOfExperience?: YearsOfExperience;
  departmentType?: UserDepartmentType;
  departmentRole?: UserDepartmentRole;
  profile: UserProfile;
  status: UserStatus;
  mfaEnabled: boolean;
  initialPaymentDone: boolean;
}

export interface UserListFilters {
  status?: UserStatus;
  profession?: UserProfession;
  availability?: UserAvailability;
  yearsOfExperience?: YearsOfExperience;
  search?: string;
  hotelId?: string;
  departmentType?: UserDepartmentType;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: UserListFilters;
}

export interface UserProfile {
  firstName: string;
  middleName?: string;
  dob: Date;
  gender?: string;
  lastName: string;
  department?: string;
  location?: {
    street?: string;
    city: string;
    state: string;
    country: string;
    pinCode?: number;
  };
}
