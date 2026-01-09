import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { upload } from "../../middleware/upload";
import { addAttachments } from "./attachements.controller";

const router = Router();

router.post(
  "/:complaintId/attachments",
  authenticate,
  authorize(["RESIDENT"]),
  upload.array("images", 5),
  addAttachments
);

export default router;
