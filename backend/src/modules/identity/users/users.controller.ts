import { Authenticate } from "../../../middleware/auth";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { Response } from "express";
import { uploadProfilePicture } from "./users.service";

export const updatePushTokenController = async (
  req: Authenticate,
  res: Response,
) => {
  const { token } = req.body;

  await db
    .update(users)
    .set({ pushToken: token })
    .where(eq(users.id, req.user!.userId));

  res.json({ message: "Token updated" });
};

export const uploadProfilePicController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const updatedUser = await uploadProfilePicture(
      userId,
      file as Express.Multer.File,
    );

    return res.status(200).json({
      message: "Profile picture updated",
      profilePicUrl: updatedUser.profilePicUrl,
    });
  } catch (error: any) {
    console.error("Profile pic upload error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to upload profile picture" });
  }
};
