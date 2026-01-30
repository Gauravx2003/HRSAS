import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import multer from "multer";
import { addLostFoundAttachments } from "./lostFoundAttachments.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/:itemId/attachments",
  authenticate,
  authorize(["RESIDENT", "STAFF", "ADMIN"]),
  upload.array("images", 5),
  addLostFoundAttachments,
);

export default router;
