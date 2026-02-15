import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  getGymPlans,
  getLibraryPlans,
  getMyMemberships,
  subscribeToGymPlan,
  subscribeToLibraryPlan,
} from "./memberships.service";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getPlansController = async (req: Authenticate, res: Response) => {
  try {
    const { type } = req.query; // 'LIBRARY' or 'GYM'

    // Get user's hostel ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId));
    if (!user || !user.hostelId) {
      return res.status(400).json({ message: "User not assigned to a hostel" });
    }

    if (type === "LIBRARY") {
      const plans = await getLibraryPlans(user.hostelId);
      return res.status(200).json(plans);
    } else if (type === "GYM") {
      const plans = await getGymPlans(user.hostelId);
      return res.status(200).json(plans);
    } else {
      return res
        .status(400)
        .json({ message: "Invalid type. Use LIBRARY or GYM" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const subscribeController = async (req: Authenticate, res: Response) => {
  try {
    const { planId, type } = req.body;

    if (!planId || !type) {
      return res.status(400).json({ message: "Plan ID and Type are required" });
    }

    let result;
    if (type === "LIBRARY") {
      result = await subscribeToLibraryPlan(req.user!.userId, planId);
    } else if (type === "GYM") {
      result = await subscribeToGymPlan(req.user!.userId, planId);
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    res.status(201).json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const getMyMembershipsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const result = await getMyMemberships(req.user!.userId);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
