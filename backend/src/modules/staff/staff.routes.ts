import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  getAssignedComplaintsController,
  updateComplaintStatusController,
  getStaffBySpecializationController,
  getStaffProfileController,
  updateStaffStatusController,
  getSecurityProfileController,
  vendorGetComplaintController,
  vendorUpdateComplaintController,
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

router.get("/complaints/:id/vendor-view", vendorGetComplaintController);
router.patch("/complaints/:id/vendor-update", vendorUpdateComplaintController);

router.get(
  "/by-specialization",
  authenticate,
  authorize(["ADMIN"]),
  getStaffBySpecializationController,
);

router.get(
  "/me",
  authenticate,
  authorize(["STAFF"]),
  getStaffProfileController,
);

router.get(
  "/security/me",
  authenticate,
  authorize(["SECURITY"]),
  getSecurityProfileController,
);

router.patch(
  "/status",
  authenticate,
  authorize(["STAFF"]),
  updateStaffStatusController,
);

export default router;
