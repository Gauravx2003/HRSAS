import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import bcrypt from "bcrypt";
import { db } from "./index";

import {
  organizations,
  hostels,
  blocks,
  rooms,
  users,
  residentProfiles,
  staffProfiles,
  complaintCategories,
} from "./schema";

import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, "Demo College"));

  // 2. Hostel
  const [hostel] = await db
    .select()
    .from(hostels)
    .where(eq(hostels.name, "Boys Hostel A"));

  // Password hash
  const passwordHash = await bcrypt.hash("password123", 10);

  const [security] = await db
    .insert(users)
    .values({
      name: "Hostel Security",
      email: "security@hostel.com",
      passwordHash,
      role: "SECURITY",
      organizationId: org.id,
      hostelId: hostel.id,
    })
    .returning();

  console.log("✅ Seeding completed successfully");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
