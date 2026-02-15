import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  createGatePassRequest,
  getMyPasses,
  approveGatePass,
  scanGatePass, // New Service function for QR Scanning
} from "./gatePass.service";
import { db } from "../../db";
import { getTableColumns, eq, desc } from "drizzle-orm";
import { gatePasses, residentProfiles, rooms, users } from "../../db/schema";

// 1. Create Request Controller
export const createGatePassController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { reason, location, type, outTime, inTime } = req.body;
    const userId = req.user!.userId;

    // Map legacy frontend types to new DB Enum
    let dbType: "ENTRY" | "EXIT" | "OVERNIGHT";
    let finalOutTime: Date;
    let finalInTime: Date;

    // Smart Type Mapping & Time Validation
    if (type === "OVERNIGHT") {
      dbType = "OVERNIGHT";
      if (!outTime || !inTime) {
        return res.status(400).json({
          message:
            "Both Out Time and In Time are required for Overnight passes.",
        });
      }
      finalOutTime = new Date(outTime);
      finalInTime = new Date(inTime);
    } else if (type === "EXIT") {
      dbType = "EXIT";
      // User provides: Expected Exit Time (outTime)
      // If inTime is missing, we assume a default duration (e.g., 4 hours) or it's open-ended (but DB needs value)
      if (!outTime) {
        return res
          .status(400)
          .json({ message: "Expected Exit Time is required for Late Exit." });
      }
      finalOutTime = new Date(outTime);

      if (inTime) {
        finalInTime = new Date(inTime);
      } else {
        // Default: 4 hours buffer if not specified
        finalInTime = new Date(finalOutTime.getTime() + 4 * 60 * 60 * 1000);
      }
    } else if (type === "ENTRY") {
      dbType = "ENTRY";
      // User provides: Expected Entry Time (inTime)
      // Context: Student is likely already outside.
      if (!inTime) {
        return res
          .status(400)
          .json({ message: "Expected Entry Time is required for Late Entry." });
      }
      finalInTime = new Date(inTime);

      if (outTime) {
        finalOutTime = new Date(outTime);
      } else {
        // Default: Assume they left "Now" or slightly in past?
        // Actually, if they are requesting Late Entry, they might be out already.
        // We set outTime to NOW to satisfy DB.
        finalOutTime = new Date();
      }
    } else {
      return res.status(400).json({ message: "Invalid request type" });
    }

    // Validation: Ensure Dates are valid
    if (isNaN(finalOutTime.getTime()) || isNaN(finalInTime.getTime())) {
      return res.status(400).json({ message: "Invalid Date format provided." });
    }

    if (finalOutTime >= finalInTime && type == "OVERNIGHT") {
      return res
        .status(400)
        .json({ message: "Out time must be before In time" });
    }

    const newPass = await createGatePassRequest(
      userId,
      dbType,
      reason,
      location || "General", // Default location if missing
      finalOutTime,
      finalInTime,
    );

    res.status(201).json({
      message: "Gate pass requested successfully",
      request: newPass,
    });
  } catch (error) {
    console.error("Create Gate Pass Error:", error);
    res.status(500).json({ message: "Failed to create request" });
  }
};

// 2. Get My History
export const getMyPassesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const requests = await getMyPasses(req.user!.userId);
    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

// 3. Get Pending (For Admin)
// export const getAllPassesController = async (
//   req: Authenticate,
//   res: Response,
// ) => {
//   const { status } = req.query;

//   try {
//     const pendingRequests = await getAllPasses(status as string);
//     res.status(200).json(pendingRequests);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch pending requests" });
//   }
// };

// 4. Approve/Reject Controller
export const updateGatePassController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or REJECTED
    const adminId = req.user!.userId;

    if (status === "APPROVED") {
      // This service function handles DB update AND QR Generation
      const result = await approveGatePass(id, adminId);
      return res.status(200).json({
        message: "Request Approved & QR Generated",
        data: result,
      });
    } else {
      // Simple Rejection
      const [result] = await db
        .update(gatePasses)
        .set({ status: "REJECTED", approvedBy: adminId })
        .where(eq(gatePasses.id, id))
        .returning();

      return res
        .status(200)
        .json({ message: "Request Rejected", data: result });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update status" });
  }
};

// 5. Scan QR Controller (New Feature for Guard App)
export const scanQrController = async (req: Authenticate, res: Response) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) return res.status(400).json({ message: "QR Token required" });

    // Call the service logic that handles IN/OUT state switching
    const result = await scanGatePass(qrToken);

    res.status(200).json({
      success: true,
      message: result.message,
      mode: result.mode, // "IN" or "OUT"
    });
  } catch (error: any) {
    console.error("Scan Error:", error);
    res.status(400).json({ message: error.message || "Invalid QR" });
  }
};

// 6. Get All (Audit Log)
export const getAllPassesController = async (
  req: Authenticate,
  res: Response,
) => {
  const { status } = req.query;

  try {
    let query = db
      .select({
        ...getTableColumns(gatePasses),
        residentName: users.name,
        residentRoomNumber: rooms.roomNumber,
      })
      .from(gatePasses)
      .leftJoin(users, eq(gatePasses.userId, users.id))
      .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
      .orderBy(desc(gatePasses.createdAt));

    if (status) {
      query.where(
        eq(
          gatePasses.status,
          status as
            | "PENDING"
            | "APPROVED"
            | "REJECTED"
            | "ACTIVE"
            | "CLOSED"
            | "EXPIRED",
        ),
      );
    }

    const result = await query;
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};
