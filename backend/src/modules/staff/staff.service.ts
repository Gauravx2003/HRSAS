import { db } from "../../db";
import {
  users,
  complaints,
  complaintCategories,
  staffProfiles,
} from "../../db/schema";
import { createNotification } from "../notifications/notifications.service";

import { eq } from "drizzle-orm";

export const getAssignedComplaints = async (staffId: string) => {
  return db
    .select({
      id: complaints.id,
      description: complaints.description,
      status: complaints.status,
      priority: complaints.priority,
      createdAt: complaints.createdAt,
      residentId: complaints.residentId,
      category: complaintCategories.name,
    })
    .from(complaints)
    .innerJoin(
      complaintCategories,
      eq(complaintCategories.id, complaints.categoryId),
    )
    .where(eq(complaints.assignedStaff, staffId));
};

export const updateComplaintStatus = async (
  complaintId: string,
  status: "IN_PROGRESS" | "RESOLVED",
  staffId: string,
) => {
  return await db.transaction(async (tx) => {
    const [complaint] = await tx
      .select()
      .from(complaints)
      .where(eq(complaints.id, complaintId));

    if (!complaint || complaint.assignedStaff != staffId) {
      throw new Error("Unauthorized");
    }

    if (status === "IN_PROGRESS") {
      await createNotification(
        tx,
        complaint.residentId,
        "Your complaint is in progress",
      );
    }

    const [updated] = await tx
      .update(complaints)
      .set({ status })
      .where(eq(complaints.id, complaintId))
      .returning();

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
    })
    .from(users)
    .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
    .where(eq(staffProfiles.specialization, specialization));
};
