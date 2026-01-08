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

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Organization
  const [org] = await db
    .insert(organizations)
    .values({ name: "Demo College" })
    .returning();

  // 2. Hostel
  const [hostel] = await db
    .insert(hostels)
    .values({
      name: "Boys Hostel A",
      organizationId: org.id,
    })
    .returning();

  // 3. Block
  const [block] = await db
    .insert(blocks)
    .values({
      name: "Block A",
      hostelId: hostel.id,
    })
    .returning();

  // 4. Room
  const [room] = await db
    .insert(rooms)
    .values({
      blockId: block.id,
      roomNumber: "101",
      capacity: 2,
    })
    .returning();

  // Password hash
  const passwordHash = await bcrypt.hash("password123", 10);

  // 5. Admin (Warden)
  const [admin] = await db
    .insert(users)
    .values({
      name: "Hostel Warden",
      email: "admin@hostel.com",
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
      hostelId: hostel.id,
    })
    .returning();

  // 6. Staff (Electrician)
  const [staff] = await db
    .insert(users)
    .values({
      name: "Electrician Ram",
      email: "electrician@hostel.com",
      passwordHash,
      role: "STAFF",
      organizationId: org.id,
      hostelId: hostel.id,
    })
    .returning();

  await db.insert(staffProfiles).values({
    userId: staff.id,
    staffType: "IN_HOUSE",
    specialization: "Electrical",
    maxActiveTasks: 5,
  });

  // 7. Resident
  const [resident] = await db
    .insert(users)
    .values({
      name: "Test Resident",
      email: "resident@hostel.com",
      passwordHash,
      role: "RESIDENT",
      organizationId: org.id,
      hostelId: hostel.id,
    })
    .returning();

  await db.insert(residentProfiles).values({
    userId: resident.id,
    roomId: room.id,
    enrollmentNumber: "ENR001",
  });

  // 8. Complaint Categories
  await db.insert(complaintCategories).values([
    { name: "Electrical", slaHours: 24, vendorOnly: false },
    { name: "Plumbing", slaHours: 24, vendorOnly: false },
    { name: "Hygiene", slaHours: 12, vendorOnly: false },
    { name: "IT", slaHours: 12, vendorOnly: false },
  ]);

  console.log("✅ Seeding completed successfully");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
