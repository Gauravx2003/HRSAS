import { db } from "../../../db";
import jwt from "jsonwebtoken";
import {
  complaintCategories,
  complaints,
  users,
  staffProfiles,
  rooms,
  escalations,
  complaintStatusHistory,
  complaintMessages,
  blocks,
  hostels,
} from "../../../db/schema";
import { createNotification } from "../../communication/notifications/notifications.service";

import {
  eq,
  NotNull,
  and,
  sql,
  getTableColumns,
  aliasedTable,
  lt,
  asc,
  count,
  gte,
  desc,
} from "drizzle-orm";
import { sendWhatsAppMessage } from "../../../services/whatsapp.service";

const VENDOR_SECRET = process.env.VENDOR_SECRET || "vendor_super_secret_key";
const WEB_PORTAL_URL = process.env.WEB_PORTAL_URL || "http://localhost:5173";

export const createComplaint = async (
  residentId: string,
  roomId: string,
  categoryId: string,
  description: string,
  title?: string,
) => {
  // Fetch category (for SLA)
  const [category] = await db
    .select()
    .from(complaintCategories)
    .where(eq(complaintCategories.id, categoryId));

  if (!category) {
    throw new Error("Category not found");
  }

  // 1. Finding Staff for resolving the complaint (Optimized Query)
  const result = await db
    .select({
      staffId: users.id,
    })
    .from(users)
    .innerJoin(staffProfiles, eq(users.id, staffProfiles.userId))
    .where(
      and(
        eq(users.role, "STAFF"),
        eq(staffProfiles.staffType, "IN_HOUSE"),
        eq(staffProfiles.specialization, category.name),
        eq(users.isActive, true),
        lt(staffProfiles.currentTasks, staffProfiles.maxActiveTasks), // Compares two columns directly
      ),
    )
    .orderBy(asc(staffProfiles.currentTasks))
    .limit(1);

  const assignedStaff = result.length > 0 ? result[0].staffId : null;

  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + category.slaHours);

  // 2. Execute Transaction
  return await db.transaction(async (tx) => {
    // A. Create Complaint
    const [complaint] = await tx
      .insert(complaints)
      .values({
        residentId,
        title,
        roomId,
        categoryId,
        assignedStaff,
        status: assignedStaff ? "ASSIGNED" : "CREATED",
        description,
        slaDeadline,
      })
      .returning();

    await tx.insert(complaintStatusHistory).values({
      complaintId: complaint.id,
      newStatus: "CREATED",
      changedBy: residentId,
    });

    // B. Handle Staff Assignment Side Effects
    if (assignedStaff) {
      // Increment the current_tasks counter for the assigned staff
      await tx
        .update(staffProfiles)
        .set({
          currentTasks: sql`${staffProfiles.currentTasks} + 1`,
        })
        .where(eq(staffProfiles.userId, assignedStaff));

      await tx.insert(complaintStatusHistory).values({
        complaintId: complaint.id,
        newStatus: "ASSIGNED",
        changedBy: residentId,
        changedTo: assignedStaff,
      });

      // Create notification
      await createNotification(tx, assignedStaff, "You have a new complaint");
    }

    return complaint;
  });
};

export const getMyComplaints = async (
  id: string,
  status?:
    | "CREATED"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "CLOSED"
    | "RESOLVED"
    | "ESCALATED",
) => {
  const { complaintAttachments } = await import("../../../db/schema");

  let query = db
    .select({
      ...getTableColumns(complaints),
      categoryName: complaintCategories.name,
      staffName: users.name,
    })
    .from(complaints)
    .leftJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .leftJoin(users, eq(complaints.assignedStaff, users.id));

  const filters = [eq(complaints.residentId, id)];

  if (status) {
    filters.push(eq(complaints.status, status));
  }

  const myComplaints = await query.where(and(...filters));

  // Fetch attachments for each complaint
  const complaintsWithAttachments = await Promise.all(
    myComplaints.map(async (complaint) => {
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

export const getEscalatedComplaints = async () => {
  const staff = aliasedTable(users, "staff");
  const resident = aliasedTable(users, "resident");

  const escalatedComplaints = await db
    .select({
      ...getTableColumns(complaints),
      categoryName: complaintCategories.name,
      residentName: resident.name,
      roomNumber: rooms.roomNumber,
      block: blocks.name,
      assignedStaffName: staff.name,
    })
    .from(complaints)
    .leftJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .leftJoin(resident, eq(complaints.residentId, resident.id))
    .leftJoin(rooms, eq(complaints.roomId, rooms.id))
    .leftJoin(blocks, eq(rooms.blockId, blocks.id))
    .leftJoin(staff, eq(complaints.assignedStaff, staff.id))
    .where(eq(complaints.status, "ESCALATED"));

  return escalatedComplaints;
};

export const getAllComplaintCategories = async () => {
  return await db.select().from(complaintCategories);
};

export const reassignComplaint = async (
  complaintId: string,
  newStaffId: string,
  adminId: string,
) => {
  //Get Existing Complaint
  return await db.transaction(async (tx) => {
    const [existingComplaint] = await tx
      .select({
        ...getTableColumns(complaints),
        slaHours: complaintCategories.slaHours,
        hostel: hostels.name,
        block: blocks.name,
        room: rooms.roomNumber,
      })
      .from(complaints)
      .innerJoin(
        complaintCategories,
        eq(complaints.categoryId, complaintCategories.id),
      )
      .innerJoin(rooms, eq(complaints.roomId, rooms.id))
      .innerJoin(blocks, eq(rooms.blockId, blocks.id))
      .innerJoin(hostels, eq(blocks.hostelId, hostels.id))
      .where(eq(complaints.id, complaintId));

    if (!existingComplaint) {
      throw new Error("Complaint not found");
    }

    // Fetch User AND Staff Profile to check if they are a VENDOR
    const [staff] = await tx
      .select()
      .from(users)
      .where(eq(users.id, newStaffId));
    const [profile] = await tx
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, newStaffId));

    if (!staff || !profile) throw new Error("Staff not found");
    if (staff.role !== "STAFF")
      throw new Error("Staff is not a valid staff member");

    await tx
      .update(staffProfiles)
      .set({ currentTasks: sql`${staffProfiles.currentTasks} + 1` })
      .where(eq(staffProfiles.userId, newStaffId));

    const newSLADeadline = new Date();
    newSLADeadline.setHours(
      newSLADeadline.getHours() + existingComplaint.slaHours,
    );

    //Update the SLA deadline for the complaint
    const [updatedComplaint] = await tx
      .update(complaints)
      .set({
        assignedStaff: newStaffId,
        slaDeadline: newSLADeadline,
        status: "ASSIGNED",
      })
      .where(eq(complaints.id, complaintId))
      .returning();

    await tx.insert(complaintStatusHistory).values({
      complaintId,
      newStatus: "ASSIGNED",
      oldStatus: existingComplaint.status,
      changedAt: new Date(),
      changedBy: adminId,
      changedTo: newStaffId,
    });

    // 🚨 VENDOR MAGIC LINK LOGIC 🚨
    if (profile.staffType === "VENDOR") {
      const tokenPayload = { complaintId, vendorId: newStaffId };
      const magicToken = jwt.sign(tokenPayload, VENDOR_SECRET, {
        expiresIn: "48h",
      });
      const magicLink = `${WEB_PORTAL_URL}/vendor/ticket/${complaintId}?token=${magicToken}`;

      const messagePayload = `🚨 *Habitat Hostel Maintenance*\n\nYou have a new task assigned.\n*Issue:* ${existingComplaint.title}\n\n*Location:*\n*Hostel:* ${existingComplaint.hostel}\n*Block:* ${existingComplaint.block}\n*Room:* ${existingComplaint.room}\n\nTap here to update your progress:\n${magicLink}`;

      // 🚀 FIRE THE ACTUAL WHATSAPP MESSAGE
      await sendWhatsAppMessage(staff.phone, messagePayload);
    } else {
      // Create normal app notification for in-house staff
      await createNotification(
        tx,
        newStaffId,
        "You have a new complaint reassigned to you",
      );
    }

    return updatedComplaint;
  });
};

export const residentCloseComplaint = async (
  complaintId: string,
  residentId: string,
) => {
  return db.transaction(async (tx) => {
    const [complaint] = await tx
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.id, complaintId),
          eq(complaints.residentId, residentId),
        ),
      );

    if (!complaint) throw new Error("Complaint not found or unauthorized");
    if (complaint.status !== "RESOLVED")
      throw new Error("Only RESOLVED complaints can be closed");

    const [closedComplaint] = await tx
      .update(complaints)
      .set({ status: "CLOSED" })
      .where(eq(complaints.id, complaintId))
      .returning();

    await tx.insert(complaintStatusHistory).values({
      complaintId,
      newStatus: "CLOSED",
      oldStatus: complaint.status,
      changedAt: new Date(),
      changedBy: residentId,
    });

    return closedComplaint;
  });
};

export const residentRejectResolution = async (
  complaintId: string,
  residentId: string,
  reason: string,
) => {
  return db.transaction(async (tx) => {
    const [complaint] = await tx
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.id, complaintId),
          eq(complaints.residentId, residentId),
        ),
      );

    if (!complaint) throw new Error("Complaint not found or unauthorized");
    if (complaint.status !== "RESOLVED")
      throw new Error("Only RESOLVED complaints can be rejected");

    const [escalatedComplaint] = await tx
      .update(complaints)
      .set({ status: "ESCALATED" })
      .where(eq(complaints.id, complaintId))
      .returning();

    const [admin] = await tx
      .select()
      .from(users)
      .where(eq(users.role, "ADMIN"));
    const now = new Date();

    await tx.insert(complaintStatusHistory).values({
      complaintId,
      newStatus: "ESCALATED",
      oldStatus: complaint.status,
      changedAt: new Date(),
      changedBy: residentId,
      changedTo: admin?.id,
    });

    await tx.insert(escalations).values({
      complaintId: complaint.id,
      level: 1,
      escalatedTo: admin?.id,
      escalatedFrom: complaint.assignedStaff,
      escalatedAt: now,
      reason,
    });

    // Note: It will now appear in the Admin's getEscalatedComplaints view
    return escalatedComplaint;
  });
};

export const adminCloseComplaint = async (
  complaintId: string,
  adminId: string,
) => {
  // Admin forceful closure (e.g., resident made a false claim)
  return db.transaction(async (tx) => {
    const [complaint] = await tx
      .select()
      .from(complaints)
      .where(eq(complaints.id, complaintId));

    if (!complaint) throw new Error("Complaint not found");

    const [closedComplaint] = await tx
      .update(complaints)
      .set({ status: "CLOSED" })
      .where(eq(complaints.id, complaintId))
      .returning();

    await tx.insert(complaintStatusHistory).values({
      complaintId,
      newStatus: "CLOSED",
      oldStatus: complaint.status,
      changedAt: new Date(),
      changedBy: adminId,
    });

    return closedComplaint;
  });
};

export const autoAssignPendingComplaint = async (tx: any, staffId: string) => {
  // 1. Get the staff member's profile and specialization
  const [staff] = await tx
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, staffId));

  if (!staff || staff.currentTasks >= staff.maxActiveTasks) return;

  // 2. Find the OLDEST "CREATED" complaint that matches their specialization
  const pendingComplaints = await tx
    .select({
      id: complaints.id,
      slaHours: complaintCategories.slaHours,
    })
    .from(complaints)
    .innerJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .where(
      and(
        eq(complaints.status, "CREATED"),
        eq(complaintCategories.name, staff.specialization),
      ),
    )
    .orderBy(asc(complaints.createdAt)) // Oldest first (FIFO queue)
    .limit(1);

  // If no pending complaints exist for this specialization, do nothing
  if (pendingComplaints.length === 0) return;

  const nextComplaint = pendingComplaints[0];

  // 3. Calculate a FRESH SLA deadline since it's only just being assigned
  const newSlaDeadline = new Date();
  newSlaDeadline.setHours(newSlaDeadline.getHours() + nextComplaint.slaHours);

  // 4. Assign the complaint
  await tx
    .update(complaints)
    .set({
      assignedStaff: staffId,
      status: "ASSIGNED",
      slaDeadline: newSlaDeadline,
    })
    .where(eq(complaints.id, nextComplaint.id));

  await tx.insert(complaintStatusHistory).values({
    complaintId: nextComplaint.id,
    newStatus: "ASSIGNED",
    oldStatus: "CREATED",
    changedAt: new Date(),
    changedTo: staffId,
  });

  // 5. Re-increment the staff member's task count (since we just gave them a new one)
  await tx
    .update(staffProfiles)
    .set({
      currentTasks: sql`${staffProfiles.currentTasks} + 1`,
    })
    .where(eq(staffProfiles.userId, staffId));

  // 6. Notify the staff member
  await createNotification(
    tx,
    staffId,
    "A pending complaint has been auto-assigned to you from the queue.",
  );
};

export const getComplaintThread = async (complaintId: string) => {
  // Fetch messages ordered by oldest first (standard chat flow)
  return await db
    .select({
      id: complaintMessages.id,
      message: complaintMessages.message,
      createdAt: complaintMessages.createdAt,
      senderId: complaintMessages.senderId,
      // Fetch sender name to display "John (Staff)" or "Rahul (Resident)"
      senderName: users.name,
      senderRole: users.role,
    })
    .from(complaintMessages)
    .innerJoin(users, eq(complaintMessages.senderId, users.id))
    .where(eq(complaintMessages.complaintId, complaintId))
    .orderBy(asc(complaintMessages.createdAt));
};

export const addMessageToThread = async (
  complaintId: string,
  senderId: string,
  message: string,
) => {
  // 1. Check if complaint is already resolved/closed
  const [complaint] = await db
    .select()
    .from(complaints)
    .where(eq(complaints.id, complaintId));

  if (!complaint) throw new Error("Complaint not found");
  if (complaint.status === "RESOLVED" || complaint.status === "CLOSED") {
    throw new Error("Cannot send messages on a closed complaint.");
  }

  // 2. Insert Message
  const [newMessage] = await db
    .insert(complaintMessages)
    .values({
      complaintId,
      senderId,
      message,
    })
    .returning();

  // 3. 🚨 The Smart Notification Routing 🚨
  // If Resident sent it -> Notify the Assigned Staff
  // If Staff sent it -> Notify the Resident

  /*
  if (senderId === complaint.userId && complaint.assignedTo) {
      sendPushNotification(complaint.assignedTo, "New message from Resident", message);
  } else if (senderId === complaint.assignedTo) {
      sendPushNotification(complaint.userId, "Update from Maintenance Staff", message);
  }
  */

  return newMessage;
};

// ─── Escalated Complaint Analytics ───
// Uses the `escalations` table as the primary source of truth for escalation data.
// Joins to `complaints` to get current status, category, block, etc.
export const getEscalatedComplaintAnalytics = async () => {
  // 1. Escalated complaint status breakdown — how many escalated complaints
  //    ended up RESOLVED, CLOSED, still ESCALATED, ASSIGNED (reassigned), etc.
  const escalatedStatusCounts = await db
    .select({
      status: complaints.status,
      count: count(),
    })
    .from(escalations)
    .innerJoin(complaints, eq(escalations.complaintId, complaints.id))
    .groupBy(complaints.status);

  // Also fetch overall complaint status counts for context
  const overallStatusCounts = await db
    .select({
      status: complaints.status,
      count: count(),
    })
    .from(complaints)
    .groupBy(complaints.status);

  // 2. Category-wise distribution of ESCALATED complaints
  const categoryDistribution = await db
    .select({
      category: complaintCategories.name,
      count: count(),
    })
    .from(escalations)
    .innerJoin(complaints, eq(escalations.complaintId, complaints.id))
    .innerJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .groupBy(complaintCategories.name);

  // 3. Block-wise distribution of ESCALATED complaints
  const blockDistribution = await db
    .select({
      block: blocks.name,
      count: count(),
    })
    .from(escalations)
    .innerJoin(complaints, eq(escalations.complaintId, complaints.id))
    .innerJoin(rooms, eq(complaints.roomId, rooms.id))
    .innerJoin(blocks, eq(rooms.blockId, blocks.id))
    .groupBy(blocks.name);

  // 4. Staff with most escalated complaints (top 5) — using escalatedFrom
  const staff = aliasedTable(users, "staff");
  const topStaff = await db
    .select({
      staffName: staff.name,
      count: count(),
    })
    .from(escalations)
    .innerJoin(staff, eq(escalations.escalatedFrom, staff.id))
    .groupBy(staff.name)
    .orderBy(desc(count()))
    .limit(5);

  // 5. Residents whose complaints escalated most (top 5)
  const resident = aliasedTable(users, "resident");
  const topResidents = await db
    .select({
      residentName: resident.name,
      count: count(),
    })
    .from(escalations)
    .innerJoin(complaints, eq(escalations.complaintId, complaints.id))
    .innerJoin(resident, eq(complaints.residentId, resident.id))
    .groupBy(resident.name)
    .orderBy(desc(count()))
    .limit(5);

  // 6. Most common category per block for escalated complaints (block × category)
  const blockCategoryData = await db
    .select({
      block: blocks.name,
      category: complaintCategories.name,
      count: count(),
    })
    .from(escalations)
    .innerJoin(complaints, eq(escalations.complaintId, complaints.id))
    .innerJoin(rooms, eq(complaints.roomId, rooms.id))
    .innerJoin(blocks, eq(rooms.blockId, blocks.id))
    .innerJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .groupBy(blocks.name, complaintCategories.name)
    .orderBy(blocks.name, desc(count()));

  // 7. Daily trend data (last 90 days) — escalated (from escalations.escalatedAt) vs resolved
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const dailyEscalated = await db
    .select({
      date: sql<string>`DATE(${escalations.escalatedAt})`.as("date"),
      count: count(),
    })
    .from(escalations)
    .where(gte(escalations.escalatedAt, ninetyDaysAgo))
    .groupBy(sql`DATE(${escalations.escalatedAt})`)
    .orderBy(sql`DATE(${escalations.escalatedAt})`);

  // For "closed" trend, we look at complaintStatusHistory for complaints
  // that were once escalated and then got CLOSED or RESOLVED
  const dailyClosed = await db
    .select({
      date: sql<string>`DATE(${complaintStatusHistory.changedAt})`.as("date"),
      count: count(),
    })
    .from(complaintStatusHistory)
    .innerJoin(
      escalations,
      eq(complaintStatusHistory.complaintId, escalations.complaintId),
    )
    .where(
      and(
        sql`${complaintStatusHistory.newStatus} IN ('CLOSED', 'RESOLVED')`,
        gte(complaintStatusHistory.changedAt, ninetyDaysAgo),
      ),
    )
    .groupBy(sql`DATE(${complaintStatusHistory.changedAt})`)
    .orderBy(sql`DATE(${complaintStatusHistory.changedAt})`);

  // 8. Total escalation count
  const [totalEscalations] = await db
    .select({ count: count() })
    .from(escalations);

  return {
    totalEscalations: Number(totalEscalations.count),
    escalatedStatusCounts: escalatedStatusCounts.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    overallStatusCounts: overallStatusCounts.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    categoryDistribution: categoryDistribution.map((c) => ({
      category: c.category,
      count: Number(c.count),
    })),
    blockDistribution: blockDistribution.map((b) => ({
      block: b.block,
      count: Number(b.count),
    })),
    topStaff: topStaff.map((s) => ({
      staffName: s.staffName,
      count: Number(s.count),
    })),
    topResidents: topResidents.map((r) => ({
      residentName: r.residentName,
      count: Number(r.count),
    })),
    blockCategoryData: blockCategoryData.map((bc) => ({
      block: bc.block,
      category: bc.category,
      count: Number(bc.count),
    })),
    dailyTrend: {
      escalated: dailyEscalated.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      closed: dailyClosed.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    },
  };
};

// ─── Reassignment History ───
export const getReassignmentHistory = async () => {
  const actor = aliasedTable(users, "actor");
  const resident = aliasedTable(users, "resident");
  const oldStaff = aliasedTable(users, "old_staff");
  const newStaff = aliasedTable(users, "new_staff");

  const history = await db
    .select({
      id: complaintStatusHistory.id,
      complaintId: complaintStatusHistory.complaintId,
      changedAt: complaintStatusHistory.changedAt,
      complaintTitle: complaints.title,
      categoryName: complaintCategories.name,
      residentName: resident.name,
      changedByName: actor.name,
      newStaffName: newStaff.name,
    })
    .from(complaintStatusHistory)
    .innerJoin(
      complaints,
      eq(complaintStatusHistory.complaintId, complaints.id),
    )
    .innerJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .innerJoin(resident, eq(complaints.residentId, resident.id))
    .leftJoin(actor, eq(complaintStatusHistory.changedBy, actor.id))
    .leftJoin(newStaff, eq(complaintStatusHistory.changedTo, newStaff.id))
    .where(
      and(
        eq(complaintStatusHistory.oldStatus, "ESCALATED"),
        eq(complaintStatusHistory.newStatus, "ASSIGNED"),
      ),
    )
    .orderBy(desc(complaintStatusHistory.changedAt));

  return history;
};
