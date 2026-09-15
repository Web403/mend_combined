import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { AdminModel } from "../modules/admin/admin.model";
import { AdminRole } from "../shared/enums/admin";

const MONGO_URI = process.env.MONGO_URI || "mongodb://test:Test1234@ac-zsw5oa2-shard-00-00.hfuearb.mongodb.net:27017/dev?ssl=true&authSource=admin";

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ DB connected");

    const passwordHash = await bcrypt.hash("MendAdmin@123", 10);

    const admin = await AdminModel.create({
      hotelId: "default", // adjust if needed
      email: "admin@mendhospitality.in",
      phone: "9284825922",
      passwordHash,
      role: AdminRole.MENDADMIN,
      status: "ACTIVE",
      profile: {
        firstName: "Mend",
        lastName: "Administrator"
      },
      loginAttempts: 0,
      mfaEnabled: false
    });

    console.log("✅ Admin created:", admin._id);

    await mongoose.disconnect();
    console.log("🔌 DB disconnected");

  } catch (err) {
    console.error("❌ SEED ERROR:", err);
    process.exit(1);
  }
};

seedAdmin();