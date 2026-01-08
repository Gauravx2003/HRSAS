import { db } from "../../db";
import {
  users,
  complaints,
  complaintCategories,
  staffProfiles,
} from "../../db/schema";

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
      eq(complaintCategories.id, complaints.categoryId)
    )
    .where(eq(complaints.assignedStaff, staffId));
};

export const updateComplaintStatus = async (
  complaintId: string,
  status: "IN_PROGRESS" | "RESOLVED",
  staffId: string
) => {
  const [complaint] = await db
    .select()
    .from(complaints)
    .where(eq(complaints.id, complaintId));

  if (!complaint || complaint.assignedStaff != staffId) {
    throw new Error("Unauthorized");
  }

  const [updated] = await db
    .update(complaints)
    .set({ status })
    .where(eq(complaints.id, complaintId))
    .returning();

  return updated;
};
