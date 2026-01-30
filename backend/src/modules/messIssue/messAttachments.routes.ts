import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { upload } from "../../middleware/upload";
import { addMessIssueAttachments } from "./messAttachments.controller";

const router = Router();

router.post(
  "/:issueId/attachments",
  authenticate,
  authorize(["RESIDENT"]),
  upload.array("images", 5),
  addMessIssueAttachments,
);

export default router;
