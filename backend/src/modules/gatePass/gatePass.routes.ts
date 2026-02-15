import { Router } from "express";
import {
  createGatePassController,
  getMyPassesController,
  updateGatePassController,
  getAllPassesController,
  scanQrController, // <--- NEW: For Guard App
} from "./gatePass.controller";
import { authenticate, authorize } from "../../middleware/auth";

const gatePassRouter = Router();

// 1. Create Request (Resident)
gatePassRouter.post(
  "/create",
  authenticate,
  authorize(["RESIDENT"]),
  createGatePassController,
);

// 2. Get My History (Resident)
gatePassRouter.get(
  "/my",
  authenticate,
  authorize(["RESIDENT"]),
  getMyPassesController,
);

// 3. Approve/Reject Pass (Admin)
gatePassRouter.patch(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  updateGatePassController,
);

// 5. Scan QR Code (Security Guard) - NEW FEATURE
gatePassRouter.post(
  "/scan",
  authenticate,
  authorize(["SECURITY", "ADMIN"]), // Only Guard/Admin can scan
  scanQrController,
);

// 6. Audit Log / All Passes (Admin/Security)
gatePassRouter.get(
  "/all",
  authenticate,
  authorize(["ADMIN", "SECURITY"]),
  getAllPassesController,
);

export default gatePassRouter;
