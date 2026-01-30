import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  createLostAndFoundItemController,
  updateLostItemController,
  claimLostAndFoundItemController,
  getMyLostItemController,
  getAllFoundItemController,
  getAllClaimedItemsController,
  closeLostAndFoundItemController,
  getAllItemsController,
  openClaimedController,
} from "./lostAndFound.controller";
import { addLostFoundAttachments } from "./lostFoundAttachments.controller";

const router = Router();

router.post(
  "/create",
  authenticate,
  authorize(["RESIDENT", "ADMIN"]),
  createLostAndFoundItemController,
);

router.patch(
  "/:id/update",
  authenticate,
  authorize(["ADMIN"]),
  updateLostItemController,
);

router.patch(
  "/:id/claim",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  claimLostAndFoundItemController,
);

router.get(
  "/my",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  getMyLostItemController,
);

router.get("/all", authenticate, authorize(["ADMIN"]), getAllItemsController);

router.get(
  "/found",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  getAllFoundItemController,
);

router.get(
  "/claimed",
  authenticate,
  authorize(["ADMIN"]),
  getAllClaimedItemsController,
);

router.patch(
  "/:id/close",
  authenticate,
  authorize(["ADMIN"]),
  closeLostAndFoundItemController,
);

router.patch(
  "/:id/open",
  authenticate,
  authorize(["ADMIN"]),
  openClaimedController,
);

// router.post(
//   "/admin/found",
//   authenticate,
//   authorize(["ADMIN"]),
//   createFoundItemByAdminController,
// );

export default router;
