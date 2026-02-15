import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  getMyMembershipsController,
  getPlansController,
  subscribeController,
} from "./memberships.controller";

const router = Router();

router.get("/plans", authenticate, getPlansController);
router.post("/subscribe", authenticate, subscribeController);
router.get("/my", authenticate, getMyMembershipsController);

export default router;
