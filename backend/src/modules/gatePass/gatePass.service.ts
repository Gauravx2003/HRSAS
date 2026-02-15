import { db } from "../../db";
import { gatePasses, users, residentProfiles, rooms } from "../../db/schema";
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
  const token = jwt.sign(qrPayload, JWT_SECRET);

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
  // 1. Find the pass by QR Token
  const passes = await db
    .select()
    .from(gatePasses)
    .where(eq(gatePasses.qrToken, qrToken))
    .limit(1);

  if (passes.length === 0) {
    throw new Error("Invalid QR Code");
  }

  const pass = passes[0];
  const now = new Date();

  // 2. Logic Flow
  // We determine action based on CURRENT STATUS and TYPE

  // --- SCENARIO A: OVERNIGHT / Standard Out-and-Back ---
  if (pass.type === "OVERNIGHT") {
    // Step 1: Going OUT
    if (pass.status === "APPROVED") {
      // Check if time is valid (optional, but good practice)
      // For now, we trust the approval.

      // Update to ACTIVE (User is OUT)
      await db
        .update(gatePasses)
        .set({
          status: "ACTIVE",
          actualOutTime: now,
        })
        .where(eq(gatePasses.id, pass.id));

      return {
        message: "Allowed: OUT",
        mode: "OUT",
        studentName: "Student", // You might want to fetch name
        type: pass.type,
      };
    }

    // Step 2: Coming IN
    if (pass.status === "ACTIVE") {
      // Update to CLOSED (User is IN)
      await db
        .update(gatePasses)
        .set({
          status: "CLOSED",
          actualInTime: now,
        })
        .where(eq(gatePasses.id, pass.id));

      return {
        message: "Allowed: IN (Welcome Back)",
        mode: "IN",
        studentName: "Student",
        type: pass.type,
      };
    }
  }

  // --- SCENARIO B: LATE ENTRY (Coming IN only) ---
  if (pass.type === "ENTRY") {
    // Status should be APPROVED.
    // They are entering. There is no OUT scan.
    if (pass.status === "APPROVED") {
      await db
        .update(gatePasses)
        .set({
          status: "CLOSED",
          actualInTime: now,
          // We can optionally set actualOutTime to something if needed, but null is fine.
        })
        .where(eq(gatePasses.id, pass.id));

      return {
        message: "Allowed: IN (Late Entry)",
        mode: "IN",
        studentName: "Student",
        type: pass.type,
      };
    }
  }

  // --- SCENARIO C: LATE EXIT (Going OUT only) ---
  if (pass.type === "EXIT") {
    // Status should be APPROVED.
    // They are leaving.
    if (pass.status === "APPROVED") {
      await db
        .update(gatePasses)
        .set({
          status: "CLOSED", // Transaction closes upon exit as per request
          actualOutTime: now,
        })
        .where(eq(gatePasses.id, pass.id));

      return {
        message: "Allowed: OUT (Late Exit)",
        mode: "OUT",
        studentName: "Student", // Fetch actual name if possible
        type: pass.type,
      };
    }
  }

  // If status is PENDING, REJECTED, CLOSED, EXPIRED, etc.
  throw new Error(`Pass is ${pass.status} - Invalid Scan`);
};
