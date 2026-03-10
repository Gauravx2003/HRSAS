import { Router } from "express";
import {
  updatePushTokenController,
  uploadProfilePicController,
} from "./users.controller";
import { authenticate } from "../../../middleware/auth";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.patch("/push-token", authenticate, updatePushTokenController);

router.post(
  "/upload-profile-pic",
  authenticate,
  upload.single("profilePic"),
  uploadProfilePicController,
);

export default router;
