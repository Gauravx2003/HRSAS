import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  getAssignedComplaintsController,
  updateComplaintStatusController,
} from "./staff.controller";

const router = Router();

router.get(
  "/complaints",
  authenticate,
  authorize(["STAFF"]),
  getAssignedComplaintsController
);

router.patch(
  "/complaints/:id/status",
  authenticate,
  authorize(["STAFF"]),
  updateComplaintStatusController
);

export default router;
