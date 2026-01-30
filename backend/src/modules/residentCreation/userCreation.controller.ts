import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import { createResident, createStaff } from "./userCreation.service";
import {
  blocks,
  hostels,
  room_types,
  rooms,
  users,
  residentProfiles,
} from "../../db/schema";
import { eq, lt, and } from "drizzle-orm";
import { db } from "../../db";

export const createResidentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { adminUser, residentData } = req.body;
    const resident = await createResident(adminUser, residentData);
    res.status(201).json(resident);
  } catch (error: any) {
    console.error("Error creating resident:", error);
    if (error.message.includes("User with email already exists")) {
      return res.status(400).json({ error: "User with email already exists" });
    }
    res.status(500).json({ error: "Failed to create resident" });
  }
};

export const getHostelBlocksController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = req.params;
    const block = await db
      .select()
      .from(blocks)
      .where(eq(blocks.hostelId, hostelId));
    res.status(200).json(block);
  } catch (error) {
    console.error("Error getting hostel blocks:", error);
    res.status(500).json({ error: "Failed to get hostel blocks" });
  }
};

export const getBlockRoomsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { blockId } = req.params;
    const room = await db
      .select()
      .from(rooms)
      .leftJoin(room_types, eq(rooms.type, room_types.id))
      .where(
        and(
          eq(rooms.blockId, blockId),
          lt(rooms.currentOccupancy, room_types.capacity),
        ),
      );

    res.status(200).json(room);
  } catch (error) {
    console.error("Error getting block rooms:", error);
    res.status(500).json({ error: "Failed to get block rooms" });
  }
};

export const createStaffController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { adminUser, staffData } = req.body;

    if (
      staffData.staffType !== "IN_HOUSE" &&
      staffData.staffType !== "VENDOR"
    ) {
      throw new Error("Invalid staff type");
    }

    const staff = await createStaff(adminUser, staffData);
    res.status(201).json(staff);
  } catch (error: any) {
    console.error("Error creating staff:", error);
    if (error.message.includes("User with email already exists")) {
      return res.status(400).json({ error: "User with email already exists" });
    }
    res.status(500).json({ error: "Failed to create staff" });
  }
};

export const getRoomResidentsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { roomId } = req.params;
    const residents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .innerJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .where(eq(residentProfiles.roomId, roomId));

    res.status(200).json(residents);
  } catch (error) {
    console.error("Error getting room residents:", error);
    res.status(500).json({ error: "Failed to get room residents" });
  }
};
