import { Router } from "express";
import {
  createNoticeController,
  getAllNoticesController,
} from "./notices.controller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

router.post("/", authenticate, authorize(["ADMIN"]), createNoticeController);
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "STAFF", "RESIDENT"]),
  getAllNoticesController
);

export default router;
