import { db } from "../../db";
import {
  users,
  residentProfiles,
  hostels,
  organizations,
  rooms,
  blocks,
  staffProfiles,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

// Helper: Generate random 8-char password
const generatePassword = () => crypto.randomBytes(4).toString("hex");

export const createResident = async (
  adminUser: {
    hostelId: string;
    organizationId: string;
  },
  residentData: {
    name: string;
    email: string;
    roomId: string;
    enrollmentNumber?: string;
  },
) => {
  //Check if room selected belongs to the same hostel as that of admin
  const roomValidation = await db
    .select({ hostelId: blocks.hostelId })
    .from(rooms)
    .innerJoin(blocks, eq(rooms.blockId, blocks.id))
    .where(eq(rooms.id, residentData.roomId))
    .limit(1);

  if (
    roomValidation.length === 0 ||
    roomValidation[0].hostelId !== adminUser.hostelId
  ) {
    throw new Error("Room not found");
  }

  //Generate Password
  const rawPassword = generatePassword();
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  return await db.transaction(async (tx) => {
    //Create User
    const [newUser] = await tx
      .insert(users)
      .values({
        name: residentData.name,
        email: residentData.email,
        passwordHash,
        role: "RESIDENT",
        isActive: true,
        hostelId: adminUser.hostelId,
        organizationId: adminUser.organizationId,
      })
      .returning();

    //Create Resident Profile
    const [newResidentProfile] = await tx
      .insert(residentProfiles)
      .values({
        userId: newUser.id,
        roomId: residentData.roomId,
        enrollmentNumber: residentData.enrollmentNumber || null,
      })
      .returning();

    //Update Room
    await tx
      .update(rooms)
      .set({ currentOccupancy: sql`current_occupancy + 1` })
      .where(eq(rooms.id, residentData.roomId));

    return {
      ...newUser,
      ...newResidentProfile,
      tempPassword: rawPassword,
    };
  });
};

export const createStaff = async (
  adminUser: {
    hostelId: string;
    organizationId: string;
  },
  staffData: {
    name: string;
    email: string;
    staffType: "IN_HOUSE" | "VENDOR";
    specialization: string;
  },
) => {
  const rawPassword = generatePassword();
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  return await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        organizationId: adminUser.organizationId,
        hostelId: adminUser.hostelId,
        name: staffData.name,
        email: staffData.email,
        role: "STAFF",
        isActive: true,
        passwordHash,
      })
      .returning();

    const [newStaffProfile] = await tx
      .insert(staffProfiles)
      .values({
        userId: newUser.id,
        staffType: staffData.staffType,
        specialization: staffData.specialization,
      })
      .returning();

    return { ...newUser, ...newStaffProfile, tempPassword: rawPassword };
  });
};

// export const users = pgTable("users", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   organizationId: uuid("organization_id")
//     .references(() => organizations.id)
//     .notNull(),
//   hostelId: uuid("hostel_id").references(() => hostels.id),

//   name: varchar("name", { length: 100 }).notNull(),
//   email: varchar("email", { length: 150 }).notNull().unique(),
//   passwordHash: text("password_hash").notNull(),
//   role: roleEnum("role").notNull(),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// export const staffProfiles = pgTable("staff_profiles", {
//   userId: uuid("user_id")
//     .references(() => users.id)
//     .primaryKey(),
//   staffType: staffTypeEnum("staff_type").notNull(),
//   specialization: varchar("specialization", { length: 50 }),
//   maxActiveTasks: integer("max_active_tasks").default(5),
// });
