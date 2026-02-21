import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";

import {
  complaints,
  complaintStatusHistory,
  hostels,
  messMenu,
  resources,
} from "./schema";
import { v4 as uuidv4 } from "uuid";

import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const [hostel] = await db
    .select()
    .from(hostels)
    .where(eq(hostels.name, "Boys Hostel A"));

  await db.insert(resources).values({
    hostelId: hostel.id,
    name: "Laundry 1",
    type: "LAUNDRY",
  });

  await db.insert(resources).values({
    hostelId: hostel.id,
    name: "Laundry 2",
    type: "LAUNDRY",
  });

  await db.insert(resources).values({
    hostelId: hostel.id,
    name: "Laundry 3",
    type: "LAUNDRY",
  });

  await db.insert(resources).values({
    hostelId: hostel.id,
    name: "Laundry 4",
    type: "LAUNDRY",
  });

  console.log("✅ Resources seeded");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
