import { authenticate } from "../../middleware/auth";
import {
  getMyNotificationsController,
  markNotificationAsReadController,
} from "./notifications.controller";
import { Router } from "express";

const router = Router();

router.get("/", authenticate, getMyNotificationsController);
router.patch("/:id/read", authenticate, markNotificationAsReadController);

export default router;
