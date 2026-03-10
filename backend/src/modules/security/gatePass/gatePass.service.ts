import { db } from "../../../db";
import { gatePasses, users, residentProfiles, rooms } from "../../../db/schema";
import { eq, desc, getTableColumns } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// 1. Create Request (Same as before, but into gatePasses)
export const createGatePassRequest = async (
  userId: string,
  type: "ENTRY" | "EXIT" | "OVERNIGHT",
  reason: string,
  location: string,
  outTime: Date,
  inTime: Date,
) => {
  const [newPass] = await db
    .insert(gatePasses)
    .values({
      userId,
      type,
      reason,
      location,
      outTime,
      inTime,
      status: "PENDING",
    })
    .returning();
  return newPass;
};

// 2. Approve Request & GENERATE QR
export const approveGatePass = async (requestId: string, adminId: string) => {
  // A. Generate the secure QR payload
  const qrPayload = {
    requestId,
    timestamp: new Date().toISOString(),
    valid: true,
  };

  // B. Sign it (This string becomes the QR code)
  const token = `GATE:${jwt.sign(qrPayload, JWT_SECRET)}`;

  // C. Update DB with Status + Token
  const [updatedPass] = await db
    .update(gatePasses)
    .set({
      status: "APPROVED",
      approvedBy: adminId,
      qrToken: token, // <--- Crucial Step
    })
    .where(eq(gatePasses.id, requestId))
    .returning();

  return updatedPass;
};

// 3. Get My Passes (For Resident App)
export const getMyPasses = async (userId: string) => {
  return await db
    .select()
    .from(gatePasses)
    .where(eq(gatePasses.userId, userId))
    .orderBy(desc(gatePasses.createdAt));
};

// 4. Get Pending (For Admin Dashboard)
export const getAllPasses = async () => {
  return await db
    .select({
      ...getTableColumns(gatePasses),
      residentName: users.name,
      roomNumber: rooms.roomNumber,
    })
    .from(gatePasses)
    .leftJoin(users, eq(gatePasses.userId, users.id))
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .where(eq(gatePasses.status, "PENDING"));
};

// 5. Scan QR Code Service
export const scanGatePass = async (qrToken: string) => {
  // 1. Find the pass AND fetch the user's name in one go
  const [record] = await db
    .select({
      pass: gatePasses,
      user: { id: users.id, name: users.name }, // Fetching user details
    })
    .from(gatePasses)
    .innerJoin(users, eq(gatePasses.userId, users.id))
    .where(eq(gatePasses.qrToken, qrToken))
    .limit(1);

  if (!record) {
    throw new Error("Invalid QR Code");
  }

  const { pass, user } = record;
  const now = new Date();

  // ─── SCENARIO A: OVERNIGHT (Out-and-Back) ───
  if (pass.type === "OVERNIGHT") {
    // Step 1: Going OUT
    if (pass.status === "APPROVED") {
      return db.transaction(async (tx) => {
        await tx
          .update(gatePasses)
          .set({ status: "ACTIVE", actualOutTime: now })
          .where(eq(gatePasses.id, pass.id));

        await tx
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, pass.userId));

        return {
          message: "Allowed: OUT",
          mode: "OUT",
          studentName: user.name,
          type: pass.type,
        };
      });
    }

    // Step 2: Coming IN
    if (pass.status === "ACTIVE") {
      return db.transaction(async (tx) => {
        await tx
          .update(gatePasses)
          .set({ status: "CLOSED", actualInTime: now })
          .where(eq(gatePasses.id, pass.id));

        await tx
          .update(users)
          .set({ isActive: true })
          .where(eq(users.id, pass.userId));

        return {
          message: "Allowed: IN (Welcome Back)",
          mode: "IN",
          studentName: user.name,
          type: pass.type,
        };
      });
    }
  }

  // ─── SCENARIO B: ENTRY PASS (Coming IN only) ───
  else if (pass.type === "ENTRY") {
    if (pass.status === "APPROVED") {
      return db.transaction(async (tx) => {
        await tx
          .update(gatePasses)
          .set({ status: "CLOSED", actualInTime: now })
          .where(eq(gatePasses.id, pass.id));

        await tx
          .update(users)
          .set({ isActive: true })
          .where(eq(users.id, pass.userId));

        return {
          message: "Allowed: IN (Late Entry)",
          mode: "IN",
          studentName: user.name,
          type: pass.type,
        };
      });
    }
  }

  // ─── SCENARIO C: EXIT PASS (Going OUT only) ───
  else if (pass.type === "EXIT") {
    if (pass.status === "APPROVED") {
      return db.transaction(async (tx) => {
        await tx
          .update(gatePasses)
          .set({ status: "CLOSED", actualOutTime: now }) // Closed immediately upon leaving
          .where(eq(gatePasses.id, pass.id));

        await tx
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, pass.userId));

        return {
          message: "Allowed: OUT (Exit Pass)",
          mode: "OUT",
          studentName: user.name,
          type: pass.type,
        };
      });
    }
  }

  // ─── FALLBACK: INVALID STATE ───
  // If we reach here, the pass type matched but the status was wrong (e.g., already CLOSED, EXPIRED, etc.)
  throw new Error(`Pass is ${pass.status} - Invalid Scan`);
};
