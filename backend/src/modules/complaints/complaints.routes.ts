import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  raiseComplaint,
  getMyComplaintsController,
} from "./complaints.controller";

const router = Router();

router.post("/", authenticate, authorize(["RESIDENT"]), raiseComplaint);
router.get(
  "/my",
  authenticate,
  authorize(["RESIDENT"]),
  getMyComplaintsController
);

export default router;
