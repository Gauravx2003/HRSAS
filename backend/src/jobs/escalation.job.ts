import { db } from "../db";
import { complaints, users, escalations } from "../db/schema";
import { eq, inArray, lt, and } from "drizzle-orm";

export const runEscalationJob = async () => {
  const now = new Date();

  const overdueComplaints = await db
    .select()
    .from(complaints)
    .where(
      and(
        inArray(complaints.status, ["ASSIGNED", "IN_PROGRESS"]),
        lt(complaints.slaDeadline, now)
      )
    );

  for (const complaint of overdueComplaints) {
    await db
      .update(complaints)
      .set({ status: "ESCALATED" })
      .where(eq(complaints.id, complaint.id));

    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "ADMIN"));

    await db.insert(escalations).values({
      complaintId: complaint.id,
      level: 1,
      escalatedTo: admin?.id,
      escalatedAt: now,
      reason: "SLA Breached",
    });
  }
};
