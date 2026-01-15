import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  createRequestController,
  getMyVisitorRequestsController,
  getPendingRequestsController,
  updateRequestController,
  getTodaysVisitorsController,
} from "./visitors.controller";

const router = Router();

router.post(
  "/create",
  authenticate,
  authorize(["RESIDENT"]),
  createRequestController
);

router.get(
  "/my-requests",
  authenticate,
  authorize(["RESIDENT"]),
  getMyVisitorRequestsController
);

router.get(
  "/pending",
  authenticate,
  authorize(["ADMIN"]),
  getPendingRequestsController
);

router.patch(
  "/update/:id",
  authenticate,
  authorize(["ADMIN"]),
  updateRequestController
);

router.get(
  "/today",
  authenticate,
  authorize(["ADMIN", "SECURITY"]),
  getTodaysVisitorsController
);

export default router;
