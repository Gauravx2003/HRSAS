import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  getAssignedComplaintsController,
  updateComplaintStatusController,
  getStaffBySpecializationController,
} from "./staff.controller";

const router = Router();

router.get(
  "/complaints",
  authenticate,
  authorize(["STAFF"]),
  getAssignedComplaintsController,
);

router.patch(
  "/complaints/:id/status",
  authenticate,
  authorize(["STAFF"]),
  updateComplaintStatusController,
);

router.get(
  "/by-specialization",
  authenticate,
  authorize(["ADMIN"]),
  getStaffBySpecializationController,
);

export default router;
