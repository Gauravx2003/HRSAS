import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  createLostAndFoundItem,
  updateLostItem,
  claimLostAndFoundItem,
  getMyLostItem,
  getAllFoundItem,
  getAllClaimedItems,
  closeLostAndFoundItem,
  openClaimedItem,
  getAllLostAndFoundItems,
} from "./lostAndFound.service";

import { db } from "../../db";
import { lostAndFoundItems, users } from "../../db/schema";
import { eq, getTableColumns } from "drizzle-orm";

// export const lostAndFoundController = async (
//   req: Authenticate,
//   res: Response,
// ) => {
//   try {
//     const {
//       title,
//       description,
//       type,
//       lostDate,
//       lostLocation,
//       foundDate,
//       foundLocation,
//     } = req.body;

//     const parsedLostDate = lostDate ? new Date(lostDate) : undefined;
//     const parsedFoundDate = foundDate ? new Date(foundDate) : undefined;

//     if (type == "LOST") {
//       if (!lostDate || !lostLocation) {
//         return res
//           .status(400)
//           .json({ error: "Lost date and location are required" });
//       }
//     }

//     if (type == "FOUND") {
//       if (!foundDate || !foundLocation) {
//         return res
//           .status(400)
//           .json({ error: "Found date and location are required" });
//       }
//     }

//     if (type == "FOUND" && req.user!.role == "RESIDENT") {
//       return res
//         .status(400)
//         .json({ error: "Found items can only be reported by staff" });
//     }

//     const item = await createLostAndFoundItem(
//       title,
//       description,
//       type,
//       req.user!.userId,
//       parsedLostDate,
//       lostLocation,
//       parsedFoundDate,
//       foundLocation,
//     );

//     return res.status(201).json(item);
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ error: "Failed to create lost and found item" });
//   }
// };

export const updateLostItemController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { foundDate, foundLocation } = req.body;

    const parsedFoundDate = foundDate ? new Date(foundDate) : undefined;

    if (parsedFoundDate && isNaN(parsedFoundDate.getTime())) {
      return res.status(400).json({ error: "Invalid foundDate" });
    }

    const item = await updateLostItem(id, new Date(foundDate), foundLocation);

    return res.status(200).json(item);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to update lost and found item" });
  }
};

export const openClaimedController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const item = await openClaimedItem(id);

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ error: "Failed to open claimed item" });
  }
};

export const closeLostAndFoundItemController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const item = await closeLostAndFoundItem(id);

    return res.status(200).json(item);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to close lost and found item" });
  }
};

export const claimLostAndFoundItemController = async (
  req: Authenticate,
  res: Response,
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
  res: Response,
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
  res: Response,
) => {
  try {
    const foundItems = await getAllFoundItem();
    return res.status(200).json(foundItems);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get found items" });
  }
};

export const getAllClaimedItemsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const claimedItems = await getAllClaimedItems();
    return res.status(200).json(claimedItems);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get claimed items" });
  }
};

export const getAllItemsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const record = await getAllLostAndFoundItems();
    return res.status(200).json(record);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get all items" });
  }
};

export const createLostAndFoundItemController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const {
      title,
      description,
      lostDate,
      lostLocation,
      foundDate,
      foundLocation,
      reportedByEmail,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        error: "Title and description are required",
      });
    }

    const userRole = req.user!.role as "ADMIN" | "RESIDENT";

    let parsedFoundDate: Date | null = null;
    let parsedLostDate: Date | null = null;

    if (userRole === "ADMIN") {
      if (!foundDate || !foundLocation) {
        return res.status(400).json({
          error: "Found date and location are required",
        });
      }

      parsedFoundDate = new Date(foundDate);
      if (isNaN(parsedFoundDate.getTime())) {
        return res.status(400).json({ error: "Invalid found date" });
      }
    } else if (userRole === "RESIDENT") {
      if (!lostDate || !lostLocation) {
        return res.status(400).json({
          error: "Lost date and location are required",
        });
      }

      parsedLostDate = new Date(lostDate);
      if (isNaN(parsedLostDate.getTime())) {
        return res.status(400).json({ error: "Invalid lost date" });
      }
    }

    const item = await createLostAndFoundItem(req.user!.userId, userRole, {
      title,
      description,
      foundDate: parsedFoundDate || undefined,
      foundLocation,
      lostDate: parsedLostDate || undefined,
      lostLocation,
      reportedByEmail: reportedByEmail || null,
    });

    return res.status(201).json(item);
  } catch (error: any) {
    console.error("Error creating found item:", error);
    return res.status(500).json({
      error: error.message || "Failed to create found item",
    });
  }
};
