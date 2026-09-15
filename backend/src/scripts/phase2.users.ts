import bcrypt from "bcryptjs";
import { UserModel } from "../modules/users/user.model";
import { createBaseFields } from "./utils";
import { UserRole } from "../shared/enums";

export const seedUsers = async (hotelId: string) => {
  const passwordHash = await bcrypt.hash("Password@123", 10);

  const manager = await UserModel.create({
    ...createBaseFields(hotelId, "USR"),
    email: "manager@demo.com",
    passwordHash,
    role: UserRole.MANAGER,
    profile: {
      firstName: "Raj",
      lastName: "Sharma",
      dob: new Date("1985-05-15"),
      gender: "Male",
      department: "Operations",
      location: {
        city: "Mumbai",
        state: "Maharashtra",
        country: "India"
      }
    }
  });

  const staff = await UserModel.create({
    ...createBaseFields(hotelId, "USR"),
    email: "staff@demo.com",
    passwordHash,
    role: UserRole.EMPLOYEE,
    profile: {
      firstName: "Anita",
      lastName: "Patil",
      dob: new Date("1992-08-22"),
      gender: "Female",
      department: "Housekeeping",
      location: {
        city: "Pune",
        state: "Maharashtra",
        country: "India"
      }
    }
  });

  console.log("👤 Users seeded");

  return { manager, staff };
};