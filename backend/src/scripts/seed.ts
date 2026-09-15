import mongoose from "mongoose";
import { env } from "../config/env";

// import { seedAdmin } from "./phase0.admin";
import { seedTenant } from "./phase1.tenant";
import { seedUsers } from "./phase2.users";
import { seedPassport } from "./phase3.passport";
import { seedJobs } from "./phase4.jobs";
import { seedAttendance } from "./phase5.attendance";
import { seedWellbeing } from "./phase6.wellbeing";
import { seedTasks } from "./phase7.tasks";

const runSeed = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log("✅ DB connected");

  // Clear existing documents before seeding
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      await db.collection(coll.name).deleteMany({});
    }
  }
  console.log("🧹 Database cleared");

  // await seedAdmin("mend_tenant");
  const { hotelId } = await seedTenant();
  const { manager, staff } = await seedUsers(hotelId);

  await seedPassport(hotelId, staff.id);
  await seedJobs(hotelId, manager.id);
  await seedAttendance(hotelId, staff.id);
  await seedWellbeing(hotelId, staff.id);
  await seedTasks(hotelId, staff.id, manager.id);

  console.log("🎉 Seeding completed successfully");
  process.exit(0);
};

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});