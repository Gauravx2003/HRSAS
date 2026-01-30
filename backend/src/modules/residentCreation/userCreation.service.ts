import { db } from "../../db";
import {
  users,
  residentProfiles,
  hostels,
  organizations,
  rooms,
  blocks,
  staffProfiles,
  room_types,
  payments,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { numeric } from "drizzle-orm/pg-core";

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
  //Check is user with email already exists
  const [userValidation] = await db
    .select()
    .from(users)
    .where(eq(users.email, residentData.email));

  if (userValidation) {
    throw new Error("User with email already exists");
  }

  //Check if room selected belongs to the same hostel as that of admin
  const [roomValidation] = await db
    .select({
      hostelId: blocks.hostelId,
      price: room_types.price,
      type: room_types.name,
    })
    .from(rooms)
    .innerJoin(blocks, eq(rooms.blockId, blocks.id))
    .innerJoin(room_types, eq(rooms.type, room_types.id))
    .where(eq(rooms.id, residentData.roomId));

  if (!roomValidation || roomValidation.hostelId !== adminUser.hostelId) {
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

    //payment update
    await tx
      .insert(payments)
      .values({
        residentId: newUser.id,
        amount: roomValidation.price,
        description: `Hostel Fee for ${residentData.name} for ${roomValidation.type}`,
        status: "COMPLETED",
        category: "HOSTEL_FEE",
      })
      .returning();

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
  //Check is user with email already exists
  const [userValidation] = await db
    .select()
    .from(users)
    .where(eq(users.email, staffData.email));

  if (userValidation) {
    throw new Error("User with email already exists");
  }

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
