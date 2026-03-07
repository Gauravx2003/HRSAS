import { Authenticate } from "../../../middleware/auth";
import { Response } from "express";
import { createResident, createStaff } from "./userCreation.service";
import {
  blocks,
  hostels,
  roomTypes,
  rooms,
  users,
  residentProfiles,
} from "../../../db/schema";
import { eq, lt, and } from "drizzle-orm";
import { db } from "../../../db";
import { sendWelcomeEmail } from "../../../services/email.service";
import {
  createResidentSchema,
  createStaffSchema,
} from "../../../middleware/validation/userCreation.validate";

export const createResidentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { adminUser, residentData } = req.body;
    const validationResult = createResidentSchema.safeParse(residentData);

    // 2. Check if validation failed
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        // .flatten().fieldErrors transforms Zod's complex error object
        // into a clean { fieldName: ["Error message"] } format
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const resident = await createResident(adminUser, residentData);
    sendWelcomeEmail(
      residentData.email,
      residentData.name,
      resident.tempPassword,
      "RESIDENT",
    );
    res.status(201).json(resident);
  } catch (error: any) {
    console.error("Error creating resident:", error);
    if (error.message.includes("User with email already exists")) {
      return res.status(400).json({ error: "User with email already exists" });
    }
    if (error.message.includes("User with phone number already exists")) {
      return res
        .status(400)
        .json({ error: "User with phone number already exists" });
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
    const { roomTypeId } = req.query;

    let conditions = [
      eq(rooms.blockId, blockId),
      lt(rooms.currentOccupancy, roomTypes.capacity),
    ];

    if (roomTypeId) {
      conditions.push(eq(rooms.type, roomTypeId as string));
    }

    const room = await db
      .select()
      .from(rooms)
      .leftJoin(roomTypes, eq(rooms.type, roomTypes.id))
      .where(and(...conditions));

    res.status(200).json(room);
  } catch (error) {
    console.error("Error getting block rooms:", error);
    res.status(500).json({ error: "Failed to get block rooms" });
  }
};

export const getRoomTypesByBlockController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { blockId } = req.params;

    // Get distinct room types that exist in rooms of this block
    const types = await db
      .selectDistinct({
        id: roomTypes.id,
        name: roomTypes.name,
        capacity: roomTypes.capacity,
        price: roomTypes.price,
      })
      .from(rooms)
      .innerJoin(roomTypes, eq(rooms.type, roomTypes.id))
      .where(eq(rooms.blockId, blockId));

    res.status(200).json(types);
  } catch (error) {
    console.error("Error getting room types:", error);
    res.status(500).json({ error: "Failed to get room types" });
  }
};

export const createStaffController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { adminUser, staffData } = req.body;
    const validationResult = createStaffSchema.safeParse(staffData);

    // 2. Check if validation failed
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        // .flatten().fieldErrors transforms Zod's complex error object
        // into a clean { fieldName: ["Error message"] } format
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    if (
      staffData.staffType !== "IN_HOUSE" &&
      staffData.staffType !== "VENDOR"
    ) {
      throw new Error("Invalid staff type");
    }

    const staff = await createStaff(adminUser, staffData);
    sendWelcomeEmail(
      staffData.email,
      staffData.name,
      staff.tempPassword,
      "STAFF",
    );
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
