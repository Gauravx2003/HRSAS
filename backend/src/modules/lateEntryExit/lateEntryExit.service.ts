import { db } from "../../db";
import {
  lateEntryRequests,
  residentProfiles,
  rooms,
  users,
} from "../../db/schema";
import { desc, eq, gte, and, getTableColumns, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const createRequest = async (
  residentId: string,
  type: "ENTRY" | "EXIT" | "OVERNIGHT",
  reason: string,
  fromTime: Date,
  toTime: Date,
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
        residentRoom: rooms.roomNumber,
      })
      .from(lateEntryRequests)
      .leftJoin(users, eq(lateEntryRequests.residentId, users.id))
      .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
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
  status: "APPROVED" | "REJECTED",
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

export const getApprovedRequests = async () => {
  const now = new Date();

  const result = await db
    .select({
      ...getTableColumns(lateEntryRequests),
      residentName: users.name,
      residentRoomNumber: rooms.roomNumber,
    })
    .from(lateEntryRequests)
    .leftJoin(users, eq(lateEntryRequests.residentId, users.id))
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .where(eq(lateEntryRequests.status, "APPROVED"));

  console.log("result", result);

  return result;
};
