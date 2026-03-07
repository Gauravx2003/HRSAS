import Router from "express";
import { authenticate, authorize } from "../../../middleware/auth";
import {
  createRoomTypeController,
  addRoomsController,
  createBlockWithRoomsController,
  createBlockWithMixedRoomsController,
  getBlocksOverviewController,
  getOccupancyStatsController,
  getRoomTypesController,
  getRoomsOfBlockController,
} from "./infrastructure.controller";

const router = Router();

// READ endpoints
router.get(
  "/overview",
  authenticate,
  authorize(["ADMIN"]),
  getBlocksOverviewController,
);
router.get(
  "/stats",
  authenticate,
  authorize(["ADMIN"]),
  getOccupancyStatsController,
);
router.get(
  "/room-types",
  authenticate,
  authorize(["ADMIN"]),
  getRoomTypesController,
);

// WRITE endpoints
router.post(
  "/room-type",
  authenticate,
  authorize(["ADMIN"]),
  createRoomTypeController,
);
router.post("/rooms", authenticate, authorize(["ADMIN"]), addRoomsController);
router.post(
  "/block-with-rooms",
  authenticate,
  authorize(["ADMIN"]),
  createBlockWithRoomsController,
);

router.post(
  "/block-with-mixed-rooms",
  authenticate,
  authorize(["ADMIN"]),
  createBlockWithMixedRoomsController,
);

router.get(
  "/blockRooms/:blockId",
  authenticate,
  authorize(["ADMIN"]),
  getRoomsOfBlockController,
);

export default router;
