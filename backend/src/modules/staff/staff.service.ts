import { db } from "../../db";
import {
  users,
  complaints,
  complaintCategories,
  staffProfiles,
  complaintStatusHistory,
  blocks,
  residentProfiles,
  rooms,
  hostels,
  complaintAttachments,
  escalations,
} from "../../db/schema";
import { autoAssignPendingComplaint } from "../support/complaints/complaints.service";
import { createNotification } from "../communication/notifications/notifications.service";
import { sendPushNotificationToUser } from "../../services/notification.service";

import { eq, and, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const VENDOR_SECRET = process.env.VENDOR_SECRET || "vendor_super_secret_key";
const WEB_PORTAL_URL = process.env.WEB_PORTAL_URL || "http://localhost:5173";

export const getAssignedComplaints = async (
  staffId: string,
  status?: "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED",
) => {
  // Create a base condition array
  const conditions = [eq(complaints.assignedStaff, staffId)];

  // If a status is provided, add it to the conditions
  if (status) {
    conditions.push(eq(complaints.status, status));
  }

  let query = db
    .select({
      id: complaints.id,
      title: complaints.title,
      description: complaints.description,
      status: complaints.status,
      priority: complaints.priority,
      createdAt: complaints.createdAt,
      residentId: complaints.residentId,
      category: complaintCategories.name,
      name: users.name,
      phone: users.phone,
      room: rooms.roomNumber,
      block: blocks.name,
    })
    .from(complaints)
    .innerJoin(
      complaintCategories,
      eq(complaintCategories.id, complaints.categoryId),
    )
    .innerJoin(users, eq(users.id, complaints.residentId))
    .innerJoin(residentProfiles, eq(residentProfiles.userId, users.id))
    .innerJoin(rooms, eq(rooms.id, residentProfiles.roomId))
    .innerJoin(blocks, eq(blocks.id, rooms.blockId));
  // Spreads all active conditions into the AND block

  const assignedComplaints = await query.where(and(...conditions));

  //Fetch Attachments
  const complaintsWithAttachments = await Promise.all(
    assignedComplaints.map(async (complaint) => {
      const attachments = await db
        .select({
          id: complaintAttachments.id,
          fileURL: complaintAttachments.fileURL,
        })
        .from(complaintAttachments)
        .where(eq(complaintAttachments.complaintId, complaint.id));

      return {
        ...complaint,
        attachments,
      };
    }),
  );

  return complaintsWithAttachments;
};

export const updateComplaintStatus = async (
  complaintId: string,
  status: "IN_PROGRESS" | "RESOLVED",
  staffId: string,
) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch the complaint and ensure it belongs to this staff member
    const [complaint] = await tx
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.id, complaintId),
          eq(complaints.assignedStaff, staffId),
        ),
      );

    if (!complaint) {
      throw new Error("Complaint not found or unauthorized");
    }

    // 2. State Machine Validation (Prevent skipping steps)
    if (status === "IN_PROGRESS" && complaint.status !== "ASSIGNED") {
      throw new Error(
        "Complaint must be in ASSIGNED state to move to IN_PROGRESS",
      );
    }

    if (status === "RESOLVED" && complaint.status !== "IN_PROGRESS") {
      throw new Error(
        "Complaint must be in IN_PROGRESS state to move to RESOLVED",
      );
    }

    // 3. Update the complaint status
    const [updated] = await tx
      .update(complaints)
      .set({ status })
      .where(eq(complaints.id, complaintId))
      .returning();

    // 4. Handle Side Effects (Notifications & Queues)
    if (status === "IN_PROGRESS") {
      // Notify resident that work has started
      await createNotification(
        tx,
        complaint.residentId,
        "Your complaint is currently in progress.",
      );

      // Push notification (fire-and-forget)
      sendPushNotificationToUser(
        complaint.residentId,
        "🔧 Complaint Update",
        "Your complaint is now being worked on.",
        { route: "/(resident)/complaints", params: { tab: "history" } },
      );
    } else if (status === "RESOLVED") {
      // Notify resident that work is finished
      await createNotification(
        tx,
        complaint.residentId,
        "Your complaint has been marked as resolved. Please review and close it.",
      );

      // Push notification (fire-and-forget)
      sendPushNotificationToUser(
        complaint.residentId,
        "✅ Complaint Resolved",
        "Your complaint has been resolved. Please review and close it.",
        { route: "/(resident)/complaints", params: { tab: "history" } },
      );

      // Decrement the staff's current tasks counter (use GREATEST to prevent negative numbers just in case)
      await tx
        .update(staffProfiles)
        .set({
          currentTasks: sql`GREATEST(${staffProfiles.currentTasks} - 1, 0)`,
        })
        .where(eq(staffProfiles.userId, staffId));

      // 🪄 Trigger the self-healing queue!
      // This immediately checks if there is a 'CREATED' complaint waiting for this staff member
      await autoAssignPendingComplaint(tx, staffId);
    }

    await tx.insert(complaintStatusHistory).values({
      complaintId,
      newStatus: status,
      oldStatus: complaint.status,
      changedBy: staffId,
    });

    return updated;
  });
};

// ─── NEW: Vendor Webhook Service ───

export const getComplaintForVendor = async (
  complaintId: string,
  token: string,
) => {
  const decoded = jwt.verify(token, VENDOR_SECRET) as {
    complaintId: string;
    vendorId: string;
  };

  if (decoded.complaintId !== complaintId) {
    throw new Error("Security Token mismatch.");
  }

  const [complaint] = await db
    .select({
      id: complaints.id,
      title: complaints.title,
      description: complaints.description,
      status: complaints.status,
      priority: complaints.priority,
      createdAt: complaints.createdAt,
      category: complaintCategories.name,
      room: rooms.roomNumber,
      block: blocks.name,
      hostel: hostels.name,
    })
    .from(complaints)
    .innerJoin(
      complaintCategories,
      eq(complaintCategories.id, complaints.categoryId),
    )
    .innerJoin(rooms, eq(rooms.id, complaints.roomId))
    .innerJoin(blocks, eq(blocks.id, rooms.blockId))
    .innerJoin(hostels, eq(hostels.id, blocks.hostelId))
    .where(eq(complaints.id, complaintId));

  if (!complaint) throw new Error("Ticket not found.");

  return complaint;
};

export const updateComplaintByVendor = async (
  complaintId: string,
  token: string,
  newStatus: "IN_PROGRESS" | "RESOLVED" | "REJECTED",
) => {
  // 1. Verify the Magic Token
  const decoded = jwt.verify(token, VENDOR_SECRET) as {
    complaintId: string;
    vendorId: string;
  };

  if (decoded.complaintId !== complaintId) {
    throw new Error("Security Token mismatch.");
  }

  const [admin] = await db.select().from(users).where(eq(users.role, "ADMIN"));
  const now = new Date();

  return await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(complaints)
      .where(eq(complaints.id, complaintId));
    if (!current) throw new Error("Ticket not found.");

    // await tx.insert(escalations).values({
    //       complaintId: complaint.id,
    //       level: 1,
    //       escalatedTo: admin?.id,
    //       escalatedFrom: complaint.assignedStaff,
    //       escalatedAt: now,
    //       reason,
    //     });

    // ─── REJECTED: Vendor declines the task ───
    if (newStatus === "REJECTED") {
      if (current.status !== "ASSIGNED") {
        throw new Error("Complaint must be in ASSIGNED state to reject");
      }

      // Revert complaint to CREATED and unassign
      const [updated] = await tx
        .update(complaints)
        .set({ status: "ESCALATED" })
        .where(eq(complaints.id, complaintId))
        .returning();

      // Decrement vendor's current tasks
      await tx
        .update(staffProfiles)
        .set({
          currentTasks: sql`GREATEST(${staffProfiles.currentTasks} - 1, 0)`,
        })
        .where(eq(staffProfiles.userId, decoded.vendorId));

      await tx.insert(escalations).values({
        complaintId,
        level: 1,
        escalatedTo: admin?.id,
        escalatedFrom: decoded.vendorId,
        escalatedAt: now,
        reason: "Vendor rejected the task",
      });

      // Log history
      await tx.insert(complaintStatusHistory).values({
        complaintId,
        oldStatus: current.status,
        newStatus: "ESCALATED",
        changedBy: decoded.vendorId,
        changedAt: new Date(),
      });

      // Notify — find an admin in this hostel to alert
      const [vendor] = await tx
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, decoded.vendorId));

      await createNotification(
        tx,
        current.residentId,
        `Vendor ${vendor?.name || ""} declined your ticket. It will be reassigned.`,
      );

      return updated;
    }

    // ─── IN_PROGRESS / RESOLVED: Existing flow ───
    if (newStatus === "IN_PROGRESS" && current.status !== "ASSIGNED") {
      throw new Error(
        "Complaint must be in ASSIGNED state to move to IN_PROGRESS",
      );
    }

    if (newStatus === "RESOLVED" && current.status !== "IN_PROGRESS") {
      throw new Error(
        "Complaint must be in IN_PROGRESS state to move to RESOLVED",
      );
    }

    const [updated] = await tx
      .update(complaints)
      .set({ status: newStatus })
      .where(eq(complaints.id, complaintId))
      .returning();

    await tx.insert(complaintStatusHistory).values({
      complaintId,
      oldStatus: current.status,
      newStatus: newStatus,
      changedBy: decoded.vendorId,
      changedAt: new Date(),
    });

    if (newStatus === "RESOLVED") {
      // Decrement vendor's current tasks on resolve
      await tx
        .update(staffProfiles)
        .set({
          currentTasks: sql`GREATEST(${staffProfiles.currentTasks} - 1, 0)`,
        })
        .where(eq(staffProfiles.userId, decoded.vendorId));
    }

    await createNotification(
      tx,
      current.residentId,
      `Vendor updated your ticket to: ${newStatus.replace("_", " ")}`,
    );

    return updated;
  });
};

export const getStaffBySpecialization = async (specialization: string) => {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      specialization: staffProfiles.specialization,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
    .where(eq(staffProfiles.specialization, specialization));
};

export const updateStaffStatus = async (staffId: string, isActive: boolean) => {
  return await db
    .update(users)
    .set({ isActive })
    .where(eq(users.id, staffId))
    .returning({
      id: users.id,
      isActive: users.isActive,
    });
};
