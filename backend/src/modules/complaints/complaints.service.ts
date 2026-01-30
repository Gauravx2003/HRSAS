import { db } from "../../db";
import {
  complaintCategories,
  complaints,
  users,
  staffProfiles,
  rooms,
} from "../../db/schema";
import { createNotification } from "../notifications/notifications.service";

import {
  eq,
  NotNull,
  and,
  sql,
  getTableColumns,
  aliasedTable,
} from "drizzle-orm";

export const createComplaint = async (
  residentId: string,
  roomId: string,
  categoryId: string,
  description: string,
  title?: string,
) => {
  //Fetch category ( for SLA )

  const [category] = await db
    .select()
    .from(complaintCategories)
    .where(eq(complaintCategories.id, categoryId));

  if (!category) {
    throw new Error("Category not found");
  }

  //Finding Staff for resolving the complaint
  const result = await db.execute(
    sql`
    SELECT 
      u.id AS "staffId",
      COUNT(c.id) AS "activeCount",
      sp.max_active_tasks AS "maxTasks"
    FROM users u
    JOIN staff_profiles sp
      ON u.id = sp.user_id
    LEFT JOIN complaints c
      ON c.assigned_staff = u.id
     AND c.status IN ('ASSIGNED', 'IN_PROGRESS')
    WHERE 
      u.role = 'STAFF'
      AND sp.staff_type = 'IN_HOUSE'
      AND sp.specialization = ${category.name}
    GROUP BY u.id, sp.max_active_tasks
    HAVING COUNT(c.id) < sp.max_active_tasks
    ORDER BY COUNT(c.id) ASC
    LIMIT 1
  `,
  );

  const assignedStaff =
    result.rows.length > 0 ? (result.rows[0].staffId as string) : null;

  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + category.slaHours);

  return await db.transaction(async (tx) => {
    //1. Create Complaint

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

    //2. Create notification
    if (assignedStaff) {
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
  const { complaintAttachments } = await import("../../db/schema");

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
      assignedStaffName: staff.name,
    })
    .from(complaints)
    .leftJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id),
    )
    .leftJoin(resident, eq(complaints.residentId, resident.id))
    .leftJoin(rooms, eq(complaints.roomId, rooms.id))
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
      })
      .from(complaints)
      .innerJoin(
        complaintCategories,
        eq(complaints.categoryId, complaintCategories.id),
      )
      .where(eq(complaints.id, complaintId));

    if (!existingComplaint) {
      throw new Error("Complaint not found");
    }

    //Validate Staff
    const [staff] = await tx
      .select()
      .from(users)
      .where(eq(users.id, newStaffId));

    if (!staff) {
      throw new Error("Staff not found");
    }

    if (staff.role !== "STAFF") {
      throw new Error("Staff is not a valid staff member");
    }

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

    //Create notification for the staff
    await createNotification(tx, newStaffId, "You have a new complaint");

    return updatedComplaint;
  });
};
