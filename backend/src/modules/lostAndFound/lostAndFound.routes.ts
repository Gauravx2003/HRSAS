import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  lostAndFoundController,
  updateLostAndFoundItemController,
  claimLostAndFoundItemController,
  getMyLostItemController,
  getAllFoundItemController,
  getAllClaimedItemsController,
  closeLostAndFoundItemController,
} from "./lostAndFound.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  lostAndFoundController
);

router.patch(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  updateLostAndFoundItemController
);

router.patch(
  "/:id/claim",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  claimLostAndFoundItemController
);

router.get(
  "/my",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  getMyLostItemController
);

router.get(
  "/found",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  getAllFoundItemController
);

router.get(
  "/claimed",
  authenticate,
  authorize(["ADMIN"]),
  getAllClaimedItemsController
);

router.patch(
  "/:id/close",
  authenticate,
  authorize(["ADMIN"]),
  closeLostAndFoundItemController
);

export default router;
