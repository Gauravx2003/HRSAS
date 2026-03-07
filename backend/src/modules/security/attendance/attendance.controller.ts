import { Authenticate } from "../../../middleware/auth";
import { Request, Response } from "express";
import {
  generateQR,
  verifyQR,
  getResidentStats,
  getResidentsOutside,
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
