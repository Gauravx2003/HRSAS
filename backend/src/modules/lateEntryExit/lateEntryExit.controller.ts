import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import { lateEntryRequests, users } from "../../db/schema";
import { eq, lt, gt, lte } from "drizzle-orm";
import { db } from "../../db";
import {
  createRequest,
  getMyRequests,
  getPendingRequests,
  updateRequest,
  getSecurityDashboard,
} from "./lateEntryExit.service";

export const createRequestController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { reason, fromTime, toTime, type } = req.body;

    if (new Date(fromTime) > new Date(toTime)) {
      return res
        .status(400)
        .json({ message: "From time should be less than to time" });
    }

    const newRequest = await createRequest(
      req.user!.userId,
      type,
      reason,
      new Date(fromTime),
      new Date(toTime)
    );

    res.status(201).json({
      message: "Late entry request created successfully",
      request: newRequest,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to create late entry request" });
  }
};

export const getMyRequestsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const requests = await getMyRequests(req.user!.userId);
    res.status(200).json(requests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};

export const getPendingRequestsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const pendingRequests = await getPendingRequests();
    res.status(200).json(pendingRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};

export const updateRequestController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await updateRequest(id, status);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to update late entry request" });
  }
};

export const getSecurityDashboardController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const result = await getSecurityDashboard();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};

// Add this enum if not exists, or just use text
// export const gatePassTypeEnum = pgEnum("gate_pass_type", ["LATE_ENTRY", "EARLY_EXIT", "OVERNIGHT"]);

// export const lateEntryRequests = pgTable("late_entry_requests", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   residentId: uuid("resident_id")
//     .references(() => users.id)
//     .notNull(),
//   type: gatePassTypeEnum("type").notNull(), // <--- RECOMMENDED ADDITION
//   reason: text("reason").notNull(),
//   fromTime: timestamp("from_time").notNull(), // When they leave / Validity start
//   toTime: timestamp("to_time").notNull(),     // When they return / Validity end
//   status: approvalStatusEnum("status").default("PENDING"),
//   createdAt: timestamp("created_at").defaultNow(),
// });
