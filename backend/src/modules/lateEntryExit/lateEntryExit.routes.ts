import { Router } from "express";
import {
  createRequestController,
  getMyRequestsController,
  getPendingRequestsController,
  updateRequestController,
  getSecurityDashboardController,
} from "./lateEntryExit.controller";
import { authenticate, authorize } from "../../middleware/auth";

const lateEntryExitRouter = Router();

lateEntryExitRouter.post(
  "/create",
  authenticate,
  authorize(["RESIDENT"]),
  createRequestController
);

lateEntryExitRouter.get(
  "/my",
  authenticate,
  authorize(["RESIDENT"]),
  getMyRequestsController
);

lateEntryExitRouter.get(
  "/pending",
  authenticate,
  authorize(["ADMIN"]),
  getPendingRequestsController
);

lateEntryExitRouter.patch(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  updateRequestController
);

lateEntryExitRouter.get(
  "/security-dashboard",
  authenticate,
  authorize(["ADMIN", "SECURITY"]),
  getSecurityDashboardController
);

export default lateEntryExitRouter;
