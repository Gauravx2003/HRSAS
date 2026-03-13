import { Router } from "express";
import { authenticate, authorize } from "../../../middleware/auth";
import { upload } from "../../../middleware/upload";
import { addAttachments } from "./communitiesAttachments.controller";

const router = Router();

router.post(
  "/:postId/attachments",
  authenticate,
  upload.array("images", 5),
  addAttachments,
);

export default router;
