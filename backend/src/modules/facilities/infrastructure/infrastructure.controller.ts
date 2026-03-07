import { Authenticate } from "../../../middleware/auth";
import { Response } from "express";
import {
  createRoomType,
  createBlock,
  addRoomsToBlock,
  initializeNewBlock,
  initializeNewBlockMixed,
  getBlocksOverview,
  getOccupancyStats,
  getRoomTypes,
} from "./infrastructure.service";
import { db } from "../../../db";
import { rooms, roomTypes } from "../../../db/schema";
import { eq } from "drizzle-orm";

// 1. Create a Room Type (e.g., "VIP Suite")
export const createRoomTypeController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { name, price, capacity, description } = req.body;
    const orgId = req.user!.organizationId; // Assuming Organization ID is on user

    const result = await createRoomType(orgId, {
      name,
      price,
      capacity,
      description,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to create room type" });
  }
};

// 2. Add Rooms to an Existing Block
export const addRoomsController = async (req: Authenticate, res: Response) => {
  try {
    const { blockId, typeId, roomNumbers } = req.body; // Expects array: ["101", "102"]

    const result = await addRoomsToBlock(blockId, typeId, roomNumbers);
    res
      .status(201)
      .json({ message: `Successfully added ${result.length} rooms.` });
  } catch (error: any) {
    if (error?.statusCode === 409) {
      return res.status(409).json({
        message: error.message,
        overlapping: error.overlapping,
      });
    }
    res.status(500).json({ message: "Failed to add rooms" });
  }
};

// 3. The "New Construction" Wizard
export const createBlockWithRoomsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { name, typeId, roomNumbers } = req.body;
    const hostelId = req.user!.hostelId;

    const newBlock = await initializeNewBlock(hostelId, name, {
      typeId,
      roomNumbers,
    });

    res.status(201).json({
      message: "Block and rooms created successfully!",
      block: newBlock,
    });
  } catch (error) {
    res.status(500).json({ message: "Construction failed" });
  }
};

export const createBlockWithMixedRoomsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { name, configurations } = req.body;
    // configurations should look like:
    // [
    //   { typeId: "uuid-standard", roomNumbers: ["101", "102"] },
    //   { typeId: "uuid-deluxe", roomNumbers: ["201", "202"] }
    // ]

    const hostelId = req.user!.hostelId;

    if (!configurations || !Array.isArray(configurations)) {
      return res.status(400).json({ message: "Invalid configuration format" });
    }

    const newBlock = await initializeNewBlockMixed(
      hostelId,
      name,
      configurations,
    );

    res.status(201).json({
      message: `Block '${newBlock.name}' created successfully with mixed room types!`,
      block: newBlock,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Construction failed" });
  }
};

// GET: Blocks overview with room breakdown
export const getBlocksOverviewController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const hostelId = req.user!.hostelId;
    const result = await getBlocksOverview(hostelId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch blocks overview" });
  }
};

// GET: Occupancy statistics
export const getOccupancyStatsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const hostelId = req.user!.hostelId;
    const result = await getOccupancyStats(hostelId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch occupancy stats" });
  }
};

// GET: All room types
export const getRoomTypesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const orgId = req.user!.organizationId;
    const result = await getRoomTypes(orgId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch room types" });
  }
};

export const getRoomsOfBlockController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { blockId } = req.params;

    const room = await db
      .select()
      .from(rooms)
      .leftJoin(roomTypes, eq(rooms.type, roomTypes.id))
      .where(eq(rooms.blockId, blockId));

    res.status(200).json(room);
  } catch (error) {
    console.error("Error getting block rooms:", error);
    res.status(500).json({ error: "Failed to get block rooms" });
  }
};
