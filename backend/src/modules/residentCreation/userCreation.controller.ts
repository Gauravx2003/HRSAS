import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import { createResident, createStaff } from "./userCreation.service";
import { blocks, hostels, rooms } from "../../db/schema";
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
  } catch (error) {
    console.error("Error creating resident:", error);
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
      .where(
        and(
          eq(rooms.blockId, blockId),
          lt(rooms.currentOccupancy, rooms.capacity),
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
  } catch (error) {
    console.error("Error creating staff:", error);
    res.status(500).json({ error: "Failed to create staff" });
  }
};
