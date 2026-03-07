import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index";

import {
  complaints,
  complaintStatusHistory,
  hostels,
  messMenu,
  organizations,
  resources,
  users,
} from "./schema";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const rawPassword = "password123";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.name, "Demo College"));

  const [hostel] = await db
    .select()
    .from(hostels)
    .where(eq(hostels.name, "Boys Hostel A"));

  // id: uuid("id").defaultRandom().primaryKey(),
  // organizationId: uuid("organization_id")
  //   .references(() => organizations.id)
  //   .notNull(),
  // hostelId: uuid("hostel_id").references(() => hostels.id),

  // name: varchar("name", { length: 100 }).notNull(),
  // email: varchar("email", { length: 150 }).notNull().unique(),
  // phone: varchar("phone", { length: 15 }).unique().notNull(),
  // dateOfBirth: date("date_of_birth").notNull(),
  // passwordHash: text("password_hash").notNull(),
  // role: roleEnum("role").notNull(),
  // isActive: boolean("is_active").default(true),
  // pushToken: text("push_token"),
  // createdAt: timestamp("created_at").defaultNow(),

  await db.insert(users).values({
    id: uuidv4(),
    organizationId: organization.id,
    hostelId: hostel.id,
    name: "John Doe",
    email: "librarian@hostel.com",
    phone: "1299567890",
    dateOfBirth: "2000-01-01",
    passwordHash: passwordHash,
    role: "LIBRARIAN",
    isActive: true,
  });

  console.log("✅ Librarian seeded ");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
