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
  room_types,
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

  const [room_type] = await db
    .insert(room_types)
    .values({
      organizationId: org.id,
      name: "Standard-2-Bed",
      description: "Standard room with 2 beds",
      price: 1000,
      capacity: 2,
    })
    .returning();

  console.log("✅ Seeding completed successfully");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
