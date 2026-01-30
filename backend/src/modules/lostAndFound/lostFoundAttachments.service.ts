import cloudinary from "../../config/cloudinary";
import { db } from "../../db";
import { lostFoundAttachments, lostAndFoundItems } from "../../db/schema";
import { eq } from "drizzle-orm";

export const uploadLostFoundAttachment = async (
  files: Express.Multer.File[],
  uploadedBy: string,
  itemId: string,
) => {
  // Safety checks - verify item exists
  const existingItem = await db
    .select()
    .from(lostAndFoundItems)
    .where(eq(lostAndFoundItems.id, itemId))
    .limit(1);

  if (existingItem.length == 0) {
    throw new Error("Item not found");
  }

  // Parallel upload to cloudinary
  const uploadPromises = files.map((file) => {
    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "hostel-lost-and-found",
        },
        (error, result) => {
          if (error || !result) {
            reject(error);
          } else {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        },
      );
      uploadStream.end(file.buffer);
    });
  });

  // Wait for ALL uploads to finish
  const uploadedResults = await Promise.all(uploadPromises);

  // Batch Insert into Database
  const records = await db
    .insert(lostFoundAttachments)
    .values(
      uploadedResults.map((img) => ({
        itemId,
        uploadedBy,
        fileUrl: img.url,
        publicId: img.publicId,
      })),
    )
    .returning();

  return records;
};
