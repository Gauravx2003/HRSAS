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
  gymPlans,
  libraryPlans,
  libraryBooks,
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

  // Only insert if not exists to avoid duplicates or assume seeding runs on fresh DB
  // For simplicity, we just insert. Or delete existing?
  // User asked for "populate", usually implies idempotent or fresh.
  // I will just insert. If error (constraint), that's acceptable for a simple seed script usually.
  // Or check if exists first? The previous script fetched org/hostel but didn't check if plans exist.
  // I'll stick to simple insert.

  // 5. Library Books
  console.log("📖 Seeding Library Books...");
  await db.insert(libraryBooks).values([
    {
      organizationId: org.id,
      hostelId: hostel.id,
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "978-0132350884",
      coverUrl:
        "https://m.media-amazon.com/images/I/41xShlnTZTL._SX376_BO1,204,203,200_.jpg",
      isDigital: false,
      status: "AVAILABLE",
    },
    {
      organizationId: org.id,
      hostelId: hostel.id,
      title: "The Pragmatic Programmer",
      author: "Andrew Hunt, David Thomas",
      isbn: "978-0201616224",
      coverUrl:
        "https://m.media-amazon.com/images/I/51W1sBPO7tL._SX380_BO1,204,203,200_.jpg",
      isDigital: true,
      downloadUrl: "https://example.com/pragmatic_programmer.pdf",
      format: "EBOOK",
      status: "AVAILABLE",
    },
    {
      organizationId: org.id,
      hostelId: hostel.id,
      title: "Introduction to Algorithms",
      author: "Thomas H. Cormen",
      isbn: "978-0262033848",
      coverUrl:
        "https://m.media-amazon.com/images/I/41T0iBxY8FL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
      isDigital: false,
      status: "AVAILABLE",
    },
    {
      organizationId: org.id,
      hostelId: hostel.id,
      title: "Design Patterns",
      author: "Erich Gamma",
      isbn: "978-0201633610",
      coverUrl:
        "https://m.media-amazon.com/images/I/51k+04D0CLL._SX376_BO1,204,203,200_.jpg",
      isDigital: false,
      status: "AVAILABLE",
    },
    {
      organizationId: org.id,
      hostelId: hostel.id,
      title: "You Don't Know JS",
      author: "Kyle Simpson",
      isbn: "978-1491904244",
      coverUrl:
        "https://m.media-amazon.com/images/I/51I90oJqFKL._SX331_BO1,204,203,200_.jpg",
      isDigital: true,
      downloadUrl: "https://example.com/ydkjs.pdf",
      format: "EBOOK",
      status: "AVAILABLE",
    },
  ]);

  console.log("✅ Seeding completed successfully");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
