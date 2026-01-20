import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  raiseComplaint,
  getMyComplaintsController,
  getEscalatedComplaintsController,
  getComplaintCategoriesController,
  reassignComplaintController,
} from "./complaints.controller";

const router = Router();

router.get("/categories", authenticate, getComplaintCategoriesController);

router.post("/", authenticate, authorize(["RESIDENT"]), raiseComplaint);
router.get(
  "/my",
  authenticate,
  authorize(["RESIDENT"]),
  getMyComplaintsController
);

router.get(
  "/escalated",
  authenticate,
  authorize(["ADMIN"]),
  getEscalatedComplaintsController
);

router.patch(
  "/reassign/:id",
  authenticate,
  authorize(["ADMIN"]),
  reassignComplaintController
);
export default router;
