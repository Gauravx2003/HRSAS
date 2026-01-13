import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  raiseComplaint,
  getMyComplaintsController,
  getEscalatedComplaintsController,
} from "./complaints.controller";

const router = Router();

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

export default router;
