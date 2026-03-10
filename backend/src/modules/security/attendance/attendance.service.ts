import redis from "../../../config/redis";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../../db";
import {
  attendanceLogs,
  users,
  residentProfiles,
  rooms,
  blocks,
  gatePasses,
} from "../../../db/schema";
import { eq, and, sql, desc, isNull, or, gte, lte } from "drizzle-orm";

export const generateQR = async () => {
  const token = uuidv4();

  await redis.set(`qr:${token}`, "VALID", "EX", 15);

  return { token };
};

export const verifyQR = async (token: string, userId: string) => {
  // Check if token exists in Redis
  const isValid = await redis.get(`qr:${token}`);

  if (!isValid) {
    throw new Error("QR Code Expired or Invalid");
  }

  // If valid, immediately delete it so it can't be reused (Replay Attack Prevention)
  await redis.del(`qr:${token}`);

  // Find the LAST log for this user
  return await db.transaction(async (tx) => {
    const lastLog = await tx.query.attendanceLogs.findFirst({
      // Use the callback to access 'eq' and the table columns
      where: (attendanceLogs, { eq }) => eq(attendanceLogs.userId, userId),

      // Use the callback to access 'desc' and the table columns
      orderBy: (attendanceLogs, { desc }) => [desc(attendanceLogs.scanTime)],
    });

    let newDirection = "OUT"; // Default if no logs (First time leaving)
    if (lastLog && lastLog.direction === "OUT") {
      newDirection = "IN"; // If last was OUT, now they are coming IN
    }

    await tx.insert(attendanceLogs).values({
      userId: userId,
      direction: newDirection,
      qrTokenUsed: token,
    });

    await tx
      .update(users)
      .set({
        isActive: newDirection === "IN",
      })
      .where(eq(users.id, userId));

    return { message: `Successfully marked as ${newDirection}` };
  });
};

export const getResidentStats = async () => {
  const result = await db
    .select({
      isActive: users.isActive,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(eq(users.role, "RESIDENT"))
    .groupBy(users.isActive);

  let insideCount = 0;
  let outsideCount = 0;

  for (const row of result) {
    if (row.isActive) {
      insideCount = row.count;
    } else {
      outsideCount = row.count;
    }
  }

  return {
    totalResidents: insideCount + outsideCount,
    insideCount,
    outsideCount,
  };
};

export const getResidentsOutside = async () => {
  const now = new Date();

  // Subquery: get the latest OUT scan time per user
  const latestOut = db
    .select({
      userId: attendanceLogs.userId,
      lastOutTime: sql<string>`max(${attendanceLogs.scanTime})`.as(
        "last_out_time",
      ),
    })
    .from(attendanceLogs)
    .where(sql`${attendanceLogs.direction} = 'OUT'`)
    .groupBy(attendanceLogs.userId)
    .as("latest_out");

  const residents = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      roomNumber: rooms.roomNumber,
      blockName: blocks.name,
      lastOutTime: latestOut.lastOutTime,
    })
    .from(users)
    .leftJoin(residentProfiles, eq(residentProfiles.userId, users.id))
    .leftJoin(rooms, eq(rooms.id, residentProfiles.roomId))
    .leftJoin(blocks, eq(blocks.id, rooms.blockId))
    .leftJoin(latestOut, eq(latestOut.userId, users.id))

    .leftJoin(
      gatePasses,
      and(
        eq(gatePasses.userId, users.id),
        eq(gatePasses.status, "APPROVED"),
        isNull(gatePasses.actualInTime),

        or(
          //1. EXIT pass: Shielded if they actually scanned and left the hostel
          and(eq(gatePasses.type, "EXIT"), isNull(gatePasses.actualOutTime)),

          //2. ENTRY pass: Shielded if they actually scanned and entered the hostel
          and(eq(gatePasses.type, "ENTRY"), gte(gatePasses.inTime, now)),

          //3. Shielded during allowed window
          and(
            eq(gatePasses.type, "OVERNIGHT"),
            gte(gatePasses.inTime, now),
            lte(gatePasses.outTime, now),
          ),
        ),
      ),
    )

    .where(
      and(
        eq(users.role, "RESIDENT"),
        eq(users.isActive, false),
        isNull(gatePasses.id),
      ),
    );

  return residents;
};
