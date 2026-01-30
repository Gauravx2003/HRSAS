import { db } from "../../db";
import {
  visitorRequests,
  users,
  residentProfiles,
  rooms,
  blocks,
} from "../../db/schema";
import { desc, eq, getTableColumns, lte, gte, and, sql } from "drizzle-orm";

const generateEntryCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const createRequest = async (
  visitorName: string,
  visitorPhone: string,
  visitDate: Date,
  residentId: string,
) => {
  const entryCode = generateEntryCode();

  const [newRequest] = await db
    .insert(visitorRequests)
    .values({
      residentId,
      visitorName,
      visitorPhone,
      entryCode,
      visitDate,
      status: "PENDING",
    })
    .returning();

  return newRequest;
};

export const getMyVisitorRequests = async (
  residentId: string,
  status?: "PENDING" | "APPROVED" | "REJECTED",
) => {
  let query = db
    .select()
    .from(visitorRequests)
    .orderBy(desc(visitorRequests.visitDate));
  query.where(eq(visitorRequests.residentId, residentId));

  if (status) {
    query.where(eq(visitorRequests.status, status));
  }

  const requests = await query;
  return requests;
};

export const getPendingRequests = async () => {
  const requests = await db
    .select({
      ...getTableColumns(visitorRequests),
      residentName: users.name,
    })
    .from(visitorRequests)
    .leftJoin(users, eq(visitorRequests.residentId, users.id))
    .where(eq(visitorRequests.status, "PENDING"))
    .orderBy(desc(visitorRequests.createdAt));
  return requests;
};

export const updateVisitorRequest = async (
  id: string,
  status: "APPROVED" | "REJECTED",
) => {
  const [updatedRequest] = await db
    .update(visitorRequests)
    .set({ status })
    .where(eq(visitorRequests.id, id))
    .returning();

  return updatedRequest;
};

//For Security Watchman
export const getTodaysVisitors = async () => {
  const todaysDate = new Date().toISOString().split("T")[0];

  console.log(todaysDate);

  const todaysVisitors = await db
    .select({
      ...getTableColumns(visitorRequests),
      residentName: users.name,
      block: blocks.name,
      roomNumber: rooms.roomNumber,
    })
    .from(visitorRequests)
    .leftJoin(users, eq(visitorRequests.residentId, users.id))
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .leftJoin(blocks, eq(rooms.blockId, blocks.id))
    .where(
      and(
        eq(visitorRequests.status, "APPROVED"),
        sql`DATE(${visitorRequests.visitDate}) = ${todaysDate}`,
      ),
    );

  return todaysVisitors;
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
