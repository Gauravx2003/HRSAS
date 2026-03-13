import { authenticate, authorize } from "../../../middleware/auth";
import { Router } from "express";
import {
  generateQRController,
  verifyQRController,
  getResidentStatsController,
  getResidentsOutsideController,
  syncOfflineController,
} from "./attendance.controller";

const router = Router();

router.get("/generate-qr", generateQRController);
router.post("/verify-qr", authenticate, verifyQRController);
router.get("/resident-stats", authenticate, getResidentStatsController);
router.get("/residents-outside", authenticate, getResidentsOutsideController);
router.post("/sync-offline", authenticate, syncOfflineController);

export default router;
