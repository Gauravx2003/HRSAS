import { Response } from "express";
import { Authenticate } from "../../middleware/auth";
import {
  bookResourceSlot,
  joinWaitlist,
  cancelAndAutoAssign,
  getResourcesWithStatus,
  getAvailableSlots,
} from "./orchestrator.service";
import { db } from "../../db";
import { resources, bookings, waitlists } from "../../db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

// 1. Get All Resources with Live Status
export const getResourcesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = req.user!;
    const enrichedResources = await getResourcesWithStatus(hostelId);
    res.json(enrichedResources);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources" });
  }
};

// 1b. Get Available Slots for a Resource
export const getAvailableSlotsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { resourceId } = req.params;
    const slots = await getAvailableSlots(resourceId);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch available slots" });
  }
};

// 2. Book a Slot (The High-Concurrency Endpoint)
export const bookSlotController = async (req: Authenticate, res: Response) => {
  try {
    const { resourceId, startTime, endTime } = req.body;
    const userId = req.user!.userId;

    const newBooking = await bookResourceSlot(
      userId,
      resourceId,
      new Date(startTime),
      new Date(endTime),
    );

    res.status(201).json({
      message: "Slot booked successfully!",
      booking: newBooking,
    });
  } catch (error: any) {
    // THIS IS THE MAGIC: If the lock was taken, we catch it and send a 409 Conflict.
    // The frontend sees 409 and shows the "Join Waitlist" button.
    if (error.name === "SLOT_TAKEN") {
      return res.status(409).json({
        message: "This slot was just taken by someone else.",
        actionRequired: "JOIN_WAITLIST",
      });
    }

    res.status(400).json({ message: error.message || "Failed to book slot" });
  }
};

// 3. Join the Waitlist
export const joinWaitlistController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { type } = req.body; // "LAUNDRY" or "BADMINTON"
    const { userId, hostelId } = req.user!;

    if (!hostelId)
      return res.status(400).json({ message: "Hostel ID missing" });

    const entry = await joinWaitlist(userId, hostelId, type);

    res.status(201).json({
      message: `You are now on the waitlist for ${type}. We will notify you when a slot opens!`,
      waitlist: entry,
    });
  } catch (error: any) {
    res
      .status(400)
      .json({ message: error.message || "Failed to join waitlist" });
  }
};

// 4. Cancel Slot (Triggers Auto-Assign)
export const cancelSlotController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { bookingId } = req.params;

    // Optional: Check if the booking actually belongs to req.user.userId
    // before allowing cancellation.

    const result = await cancelAndAutoAssign(bookingId);

    res.json(result);
  } catch (error: any) {
    res
      .status(400)
      .json({ message: error.message || "Failed to cancel booking" });
  }
};

// 5. Get My Active Bookings & Waitlists
export const getMyQueueController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();

    const myBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          inArray(bookings.status, ["CONFIRMED", "ACTIVE"]),
          gte(bookings.endTime, now), // Only fetch future/current slots
        ),
      );

    const myWaitlists = await db
      .select()
      .from(waitlists)
      .where(
        and(eq(waitlists.userId, userId), eq(waitlists.status, "WAITING")),
      );

    res.json({ bookings: myBookings, waitlists: myWaitlists });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your queue" });
  }
};
