import { Authenticate } from "../../../middleware/auth";
import { Request, Response } from "express";
import {
  generateQR,
  verifyQR,
  getResidentStats,
  getResidentsOutside,
  syncOfflineLogs,
  OfflineLog,
} from "./attendance.service";

export const generateQRController = async (
  req: Authenticate,
  res: Response,
) => {
  const result = await generateQR();
  return res.status(200).json({ success: true, data: result });
};

export const verifyQRController = async (req: Authenticate, res: Response) => {
  const result = await verifyQR(req.body.token, req.user!.userId);
  return res.status(200).json({ success: true, data: result });
};

export const getResidentStatsController = async (
  req: Authenticate,
  res: Response,
) => {
  const result = await getResidentStats();
  return res.status(200).json({ success: true, data: result });
};

export const getResidentsOutsideController = async (
  req: Authenticate,
  res: Response,
) => {
  const result = await getResidentsOutside();
  return res.status(200).json({ success: true, data: result });
};

export const syncOfflineController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { records } = req.body as { records: OfflineLog[] };
    const securityGuardId = req.user!.userId;

    // 1. Validate payload
    if (!Array.isArray(records)) {
      return res.status(400).json({ message: "'records' must be an array" });
    }
    if (records.length === 0) {
      return res
        .status(200)
        .json({ message: "No records to sync", syncedCount: 0 });
    }

    // 2. Process the sync
    const synced = await syncOfflineLogs(records, securityGuardId);

    // 3. Return success so the tablet knows it can delete its local cache
    return res.status(201).json({
      message: "Offline sync complete",
      syncedCount: synced.length,
    });
  } catch (error: any) {
    console.error("Offline Sync Error:", error);
    return res.status(500).json({ message: "Failed to sync offline records" });
  }
};
