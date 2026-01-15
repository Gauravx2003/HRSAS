import { db } from "../../db";
import { lateEntryRequests, users } from "../../db/schema";
import { desc, eq, gte, and, getTableColumns } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const createRequest = async (
  residentId: string,
  type: "ENTRY" | "EXIT" | "OVERNIGHT",
  reason: string,
  fromTime: Date,
  toTime: Date
) => {
  try {
    const [newRequest] = await db
      .insert(lateEntryRequests)
      .values({
        residentId,
        type,
        reason,
        fromTime,
        toTime,
        status: "PENDING",
      })
      .returning();

    return newRequest;
  } catch (error) {
    console.error("DB insert failed:", error);
    throw error;
  }
};

export const getMyRequests = async (residentId: string) => {
  try {
    const requests = await db
      .select()
      .from(lateEntryRequests)
      .where(eq(lateEntryRequests.residentId, residentId))
      .orderBy(desc(lateEntryRequests.createdAt));
    return requests;
  } catch (error) {
    console.error("DB select failed:", error);
    throw error;
  }
};

export const getPendingRequests = async () => {
  try {
    const requests = await db
      .select({
        ...getTableColumns(lateEntryRequests),
        residentName: users.name,
      })
      .from(lateEntryRequests)
      .leftJoin(users, eq(lateEntryRequests.residentId, users.id))
      .where(eq(lateEntryRequests.status, "PENDING"))
      .orderBy(desc(lateEntryRequests.createdAt));
    return requests;
  } catch (error) {
    console.error("DB select failed:", error);
    throw error;
  }
};

export const updateRequest = async (
  id: string,
  status: "APPROVED" | "REJECTED"
) => {
  try {
    const [updatedRequest] = await db
      .update(lateEntryRequests)
      .set({ status })
      .where(eq(lateEntryRequests.id, id))
      .returning();
    return updatedRequest;
  } catch (error) {
    console.error("DB update failed:", error);
    throw error;
  }
};

export const getSecurityDashboard = async () => {
  const now = new Date();

  const result = await db
    .select({
      ...getTableColumns(lateEntryRequests),
      residentName: users.name,
    })
    .from(lateEntryRequests)
    .leftJoin(users, eq(lateEntryRequests.residentId, users.id))
    .where(
      and(
        eq(lateEntryRequests.status, "APPROVED"),
        gte(lateEntryRequests.toTime, sql`NOW()`)
      )
    );

  return result;
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
