import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  createResidentController,
  getHostelBlocksController,
  getBlockRoomsController,
  createStaffController,
} from "./userCreation.controller";

const router = Router();

router.post(
  "/resident",
  authenticate,
  authorize(["ADMIN"]),
  createResidentController,
);

router.get(
  "/hostelBlocks/:hostelId",
  authenticate,
  authorize(["ADMIN"]),
  getHostelBlocksController,
);

router.get(
  "/blockRooms/:blockId",
  authenticate,
  authorize(["ADMIN"]),
  getBlockRoomsController,
);

router.post(
  "/staff",
  authenticate,
  authorize(["ADMIN"]),
  createStaffController,
);

export default router;
