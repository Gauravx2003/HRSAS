import { Router } from "express";
import {
  createRequestController,
  getMyRequestsController,
  getPendingRequestsController,
  updateRequestController,
  getApprovedRequestsController,
  getAllRequestsController,
} from "./lateEntryExit.controller";
import { authenticate, authorize } from "../../middleware/auth";

const lateEntryExitRouter = Router();

lateEntryExitRouter.post(
  "/create",
  authenticate,
  authorize(["RESIDENT"]),
  createRequestController,
);

lateEntryExitRouter.get(
  "/my",
  authenticate,
  authorize(["RESIDENT"]),
  getMyRequestsController,
);

lateEntryExitRouter.patch(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  updateRequestController,
);

lateEntryExitRouter.get(
  "/pending",
  authenticate,
  authorize(["ADMIN"]),
  getPendingRequestsController,
);

lateEntryExitRouter.get(
  "/approved",
  authenticate,
  authorize(["ADMIN", "SECURITY"]),
  getApprovedRequestsController,
);

lateEntryExitRouter.get(
  "/all",
  authenticate,
  authorize(["ADMIN", "SECURITY"]),
  getAllRequestsController,
);

export default lateEntryExitRouter;
