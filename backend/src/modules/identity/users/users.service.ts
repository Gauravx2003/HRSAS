import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { uploadMultipleFiles } from "../../../utils/cloudinary.upload";
import cloudinary from "../../../config/cloudinary";

export const uploadProfilePicture = async (
  userId: string,
  file: Express.Multer.File,
) => {
  // 1. Get current user
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser) {
    throw new Error("User not found");
  }

  // 2. Delete existing profile picture from Cloudinary if it exists
  if (currentUser.profilePicPublicId) {
    try {
      await cloudinary.uploader.destroy(currentUser.profilePicPublicId);
    } catch (error) {
      console.error(
        "Failed to delete old profile picture from Cloudinary",
        error,
      );
    }
  }

  // 3. Upload new picture
  const uploadResult = await uploadMultipleFiles([file], "profile_pics");

  if (!uploadResult || uploadResult.length === 0) {
    throw new Error("Failed to upload profile picture");
  }

  const { url, publicId } = uploadResult[0];

  // 4. Update the database
  const [updatedUser] = await db
    .update(users)
    .set({
      profilePicUrl: url,
      profilePicPublicId: publicId,
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
};
