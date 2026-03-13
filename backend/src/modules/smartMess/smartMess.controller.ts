import { Authenticate } from "../../middleware/auth";
import { Request, Response } from "express";
import {
  getDailyMenu,
  optInForMeal,
  optOutForMeal,
  scanMessQr,
  createDailyMenu,
  getWastageAnalytics,
} from "./smartMess.service";
import { db } from "../../db";
import { messMenu } from "../../db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_MESS_RULES } from "./smartMess.config";

// 1. Get Menu
// 1. Get Menu
export const getMenuController = async (req: Authenticate, res: Response) => {
  try {
    const today = new Date();
    // Pass userId if available to check opt-in status
    const menu = await getDailyMenu(
      req.user!.hostelId!,
      today,
      req.user?.userId,
    );
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch menu" });
  }
};

// 2. Create Menu (Admin Only) - Calculates Timestamps
export const createMenuController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { date, mealType, items, customCutoffHours, customServeTime } =
      req.body;

    if (!req.user?.hostelId)
      return res.status(400).json({ message: "Hostel ID missing" });

    // A. Get Default Rule
    const rule =
      DEFAULT_MESS_RULES[mealType as keyof typeof DEFAULT_MESS_RULES];
    if (!rule) return res.status(400).json({ message: "Invalid meal type" });

    // B. Calculate Serving Time (Date + Rule Time)
    // Input date is "YYYY-MM-DD", rule.serveTime is "HH:MM"
    const serveTime = customServeTime || rule.serveTime;
    const servingTime = new Date(`${date}T${serveTime}:00`);

    // C. Calculate Cutoff Time (Serving Time - Cutoff Hours)
    const hoursToSubtract = customCutoffHours || rule.cutoffHours;
    const cutoffTime = new Date(servingTime);
    cutoffTime.setHours(cutoffTime.getHours() - hoursToSubtract);

    // D. Save
    const menu = await createDailyMenu({
      hostelId: req.user.hostelId,
      date: new Date(date),
      mealType,
      items,
      servingTime,
      cutoffTime,
    });

    res.status(201).json(menu);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create menu" });
  }
};

// 3. Opt-In (Student) - Simplified Logic
export const optInController = async (req: Authenticate, res: Response) => {
  try {
    const { menuId } = req.body;

    // A. Fetch Menu to check cutoff
    const menuEntry = await db.query.messMenu.findFirst({
      where: eq(messMenu.id, menuId),
    });

    if (!menuEntry) return res.status(404).json({ message: "Menu not found" });

    // B. THE CHECK: Is NOW after the Cutoff?
    if (new Date() > menuEntry.cutoffTime) {
      return res.status(400).json({
        message: `Booking closed! Deadline was ${menuEntry.cutoffTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      });
    }

    // C. Proceed
    const ticket = await optInForMeal(req.user!.userId, menuId);
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Opt-in failed" });
  }
};

// 4. Scan QR (Staff)
export const scanMessController = async (req: Authenticate, res: Response) => {
  try {
    const { qrToken } = req.body;
    const result = await scanMessQr(qrToken);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
// 5. Opt-Out (Student)
export const optOutController = async (req: Authenticate, res: Response) => {
  try {
    const { menuId } = req.body;
    const result = await optOutForMeal(req.user!.userId, menuId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Opt-out failed" });
  }
};

// 6. Wastage Analytics
export const getWastageAnalyticsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    if (!req.user?.hostelId)
      return res.status(400).json({ message: "Hostel ID missing" });

    const analytics = await getWastageAnalytics(req.user.hostelId);
    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch wastage analytics" });
  }
};
