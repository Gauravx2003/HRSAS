import { db } from "../../db";
import {
  complaintCategories,
  complaints,
  users,
  staffProfiles,
} from "../../db/schema";
import { createNotification } from "../notifications/notifications.service";

import { eq, NotNull, and, sql, getTableColumns } from "drizzle-orm";

export const createComplaint = async (
  residentId: string,
  roomId: string,
  categoryId: string,
  description: string
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
  `
  );

  const assignedStaff =
    result.rows.length > 0 ? (result.rows[0].staffId as string) : null;

  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + category.slaHours);

  if (assignedStaff) {
    await createNotification(assignedStaff, "You have a new complaint");
  }

  const [complaint] = await db
    .insert(complaints)
    .values({
      residentId,
      roomId,
      categoryId,
      assignedStaff,
      status: assignedStaff ? "ASSIGNED" : "CREATED",
      description,
      slaDeadline,
    })
    .returning();

  return complaint;
};

export const getMyComplaints = async (id: string) => {
  const myComplaints = await db
    .select({
      ...getTableColumns(complaints),
      categoryName: complaintCategories.name,
    })
    .from(complaints)
    .leftJoin(
      complaintCategories,
      eq(complaints.categoryId, complaintCategories.id)
    )
    .where(eq(complaints.residentId, id));

  return myComplaints;
};

export const getEscalatedComplaints = async () => {
  const escalatedComplaints = await db
    .select()
    .from(complaints)
    .where(eq(complaints.status, "ESCALATED"));

  return escalatedComplaints;
};
