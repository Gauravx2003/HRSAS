// modules/support/complaints/attachments.service.ts
import { db } from "../../../db";
import { postAttachments, posts } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { uploadMultipleFiles } from "../../../utils/cloudinary.upload";

export const uploadCommunityPostAttachment = async (
  files: Express.Multer.File[],
  uploadedBy: string,
  postId: string,
) => {
  // 1. Safety Checks
  const [existingItem] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existingItem) throw new Error("Item not found");
  if (existingItem.authorId !== uploadedBy) {
    throw new Error("Unauthorized");
  }

  // 2. Use the Shared Utility!
  const uploadedResults = await uploadMultipleFiles(files, "community-posts");

  // 3. Batch Insert into Complaints DB
  const records = await db
    .insert(postAttachments)
    .values(
      uploadedResults.map((img) => ({
        postId: postId,
        uploadedBy,
        fileURL: img.url,
        publicId: img.publicId,
      })),
    )
    .returning();

  return records;
};
