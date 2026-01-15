import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  createRequest,
  getMyVisitorRequests,
  getPendingRequests,
  updateVisitorRequest,
  getTodaysVisitors,
} from "./visitors.service";

export const createRequestController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { visitorName, visitorPhone, visitDate } = req.body;
    const newRequest = await createRequest(
      visitorName,
      visitorPhone,
      new Date(visitDate),
      req.user!.userId
    );
    return res.status(201).json(newRequest);
  } catch (error) {
    console.error("DB insert failed:", error);
    return res.status(500).json({ error: "Failed to create request" });
  }
};

export const getMyVisitorRequestsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const requests = await getMyVisitorRequests(req.user!.userId);
    return res.status(200).json(requests);
  } catch (error) {
    console.error("DB select failed:", error);
    return res.status(500).json({ error: "Failed to get requests" });
  }
};


//ADMIN
export const getPendingRequestsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const pendingrequests = await getPendingRequests();
    return res.status(200).json(pendingrequests);
  } catch (error) {
    console.error("DB select failed:", error);
    return res.status(500).json({ error: "Failed to get requests" });
  }
};

export const updateRequestController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status != "APPROVED" && status != "REJECTED") {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedRequest = await updateVisitorRequest(id, status);
    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error("DB update failed:", error);
    return res.status(500).json({ error: "Failed to update request" });
  }
};

//For Security

export const getTodaysVisitorsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const todaysVisitors = await getTodaysVisitors();
    return res.status(200).json(todaysVisitors);
  } catch (error) {
    console.error("DB select failed:", error);
    return res.status(500).json({ error: "Failed to get requests" });
  }
};

// export const visitorRequests = pgTable("visitor_requests", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   residentId: uuid("resident_id")
//     .references(() => users.id)
//     .notNull(),

//   // New Fields for Authenticity
//   visitorName: varchar("visitor_name", { length: 100 }).notNull(),
//   visitorPhone: varchar("visitor_phone", { length: 15 }).notNull(),
//   entryCode: varchar("entry_code", { length: 6 }).notNull(), // 6-digit Security Code

//   visitDate: timestamp("visit_date").notNull(),
//   status: approvalStatusEnum("status").default("PENDING"),
//   createdAt: timestamp("created_at").defaultNow(),
// });
