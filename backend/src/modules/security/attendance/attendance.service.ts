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
import * as OTPAuth from "otpauth";

export const generateQR = async () => {
  const token = uuidv4();

  await redis.set(`qr:${token}`, "VALID", "EX", 15);

  return { token };
};

export const verifyQR = async (token: string, userId: string) => {
  const secret = process.env.GATE_TOTP_SECRET;
  if (!secret)
    throw new Error("Server configuration error: TOTP secret missing");

  // 1. 🚨 Configure the TOTP Engine (10-second period to perfectly match the frontend)
  const totp = new OTPAuth.TOTP({
    issuer: "HabitatHostel",
    label: "Gate",
    algorithm: "SHA1",
    digits: 6,
    period: 10,
    secret: secret, // otpauth automatically parses Base32 strings!
  });

  // 2. 🚨 Validate the token.
  // window: 1 means it checks the current 10s window, plus 1 before and 1 after (handling network lag).
  // It returns an integer (the delta) if valid, or null if invalid.
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    throw new Error("QR Code Expired or Invalid");
  }

  // Find the LAST log for this user
  return await db.transaction(async (tx) => {
    const [existingScan] = await tx.query.attendanceLogs.findMany({
      where: (logs, { eq }) => eq(logs.qrTokenUsed, token),
      limit: 1,
    });

    if (existingScan) {
      throw new Error(
        "This QR code has already been scanned. Please wait for the next one.",
      );
    }

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

// The TypeScript interface for the incoming offline payload
export interface OfflineLog {
  userId: string;
  direction: "IN" | "OUT";
  scannedAt: string; // ISO Date String from the tablet
}

export const syncOfflineLogs = async (
  records: OfflineLog[],
  securityGuardId: string,
) => {
  if (!records || records.length === 0) return [];

  return await db.transaction(async (tx) => {
    const valuesToInsert = records.map((record) => {
      // Create a date object from the tablet's UTC string
      const utcDate = new Date(record.scannedAt);

      // Manually add 5 hours and 30 minutes (IST Offset)
      // 5.5 hours * 60 mins * 60 secs * 1000 ms
      const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);

      return {
        userId: record.userId,
        direction: record.direction,
        scanTime: istDate, // 🚨 Now it matches your database's local clock!
        scannedBy: securityGuardId,
        isOfflineSync: true,
      };
    });

    const syncedRecords = await tx
      .insert(attendanceLogs)
      .values(valuesToInsert)
      .returning();

    // 2. Get a list of unique user IDs from this batch
    // (Using a Set prevents us from updating the same user twice if they scanned IN and OUT offline)
    const uniqueUserIds = Array.from(new Set(records.map((r) => r.userId)));

    // 3. 🚨 FIX: Use a sequential for...of loop instead of Promise.all inside a transaction
    for (const userId of uniqueUserIds) {
      // Find the absolute latest log for this user
      const latestLog = await tx.query.attendanceLogs.findFirst({
        where: (logs, { eq }) => eq(logs.userId, userId),
        orderBy: (logs, { desc }) => [desc(logs.scanTime)],
      });

      console.log("Latest Log is:", latestLog);

      // If a log exists, update the user's status
      if (latestLog) {
        await tx
          .update(users)
          .set({
            isActive: latestLog.direction === "IN",
          })
          .where(eq(users.id, userId));
      }
    }

    return syncedRecords;
  });
};
