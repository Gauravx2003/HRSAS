import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  createLostAndFoundItem,
  updateLostAndFoundItem,
  claimLostAndFoundItem,
  getMyLostItem,
  getAllFoundItem,
} from "./lostAndFound.service";

export const lostAndFoundController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const {
      title,
      description,
      type,
      lostDate,
      lostLocation,
      foundDate,
      foundLocation,
    } = req.body;

    const parsedLostDate = lostDate ? new Date(lostDate) : undefined;
    const parsedFoundDate = foundDate ? new Date(foundDate) : undefined;

    if (type == "LOST") {
      if (!lostDate || !lostLocation) {
        return res
          .status(400)
          .json({ error: "Lost date and location are required" });
      }
    }

    if (type == "FOUND") {
      if (!foundDate || !foundLocation) {
        return res
          .status(400)
          .json({ error: "Found date and location are required" });
      }
    }

    if (type == "FOUND" && req.user!.role == "RESIDENT") {
      return res
        .status(400)
        .json({ error: "Found items can only be reported by staff" });
    }

    const item = await createLostAndFoundItem(
      title,
      description,
      type,
      req.user!.userId,
      parsedLostDate,
      lostLocation,
      parsedFoundDate,
      foundLocation
    );

    return res.status(201).json(item);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to create lost and found item" });
  }
};

export const updateLostAndFoundItemController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { type, foundDate, foundLocation, status } = req.body;

    if (type == "FOUND" && req.user!.role == "RESIDENT") {
      return res
        .status(400)
        .json({ error: "Found items can only be reported by staff" });
    }

    const parsedFoundDate = foundDate ? new Date(foundDate) : undefined;

    if (parsedFoundDate && isNaN(parsedFoundDate.getTime())) {
      return res.status(400).json({ error: "Invalid foundDate" });
    }

    const item = await updateLostAndFoundItem(
      id,
      type,
      parsedFoundDate,
      foundLocation,
      status
    );

    return res.status(200).json(item);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to update lost and found item" });
  }
};

export const claimLostAndFoundItemController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { id } = req.params;

    const item = await claimLostAndFoundItem(id, req.user!.userId);

    return res.status(200).json(item);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to claim lost and found item" });
  }
};

export const getMyLostItemController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const myLostItems = await getMyLostItem(req.user!.userId);
    return res.status(200).json(myLostItems);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get my lost items" });
  }
};

export const getAllFoundItemController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const foundItems = await getAllFoundItem();
    return res.status(200).json(foundItems);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get found items" });
  }
};
