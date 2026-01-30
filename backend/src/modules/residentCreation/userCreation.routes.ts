import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  createResidentController,
  getHostelBlocksController,
  getBlockRoomsController,
  createStaffController,
  getRoomResidentsController,
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

router.get(
  "/roomResidents/:roomId",
  authenticate,
  authorize(["ADMIN"]),
  getRoomResidentsController,
);

export default router;
