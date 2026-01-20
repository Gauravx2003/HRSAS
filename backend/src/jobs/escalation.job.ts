import { db } from "../db";
import { complaints, users, escalations } from "../db/schema";
import { eq, inArray, lt, and, sql } from "drizzle-orm";

export const runEscalationJob = async () => {
  console.log("Running escalation job");

  const now = new Date();

  const overdueComplaints = await db
    .select()
    .from(complaints)
    .where(
      and(
        inArray(complaints.status, ["CREATED", "ASSIGNED", "IN_PROGRESS"]),
        lt(complaints.slaDeadline, sql`NOW()`),
      ),
    );

  console.log(overdueComplaints);

  const [admin] = await db.select().from(users).where(eq(users.role, "ADMIN"));

  if (!admin) {
    throw new Error("Admin not found");
  }

  for (const complaint of overdueComplaints) {
    await db
      .update(complaints)
      .set({ status: "ESCALATED" })
      .where(eq(complaints.id, complaint.id));

    await db.insert(escalations).values({
      complaintId: complaint.id,
      level: 1,
      escalatedTo: admin?.id,
      escalatedAt: now,
      reason: "SLA Breached",
    });
  }
};
