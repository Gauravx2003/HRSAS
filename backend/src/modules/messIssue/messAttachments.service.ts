import cloudinary from "../../config/cloudinary";
import { db } from "../../db";
import { messIssues, messIssueAttachments } from "../../db/schema";
import { eq } from "drizzle-orm";

export const uploadMessIssueAttachment = async (
  files: Express.Multer.File[],
  uploadedBy: string,
  issueId: string,
) => {
  //Safety checks whether if issue exists and if the user is authorized to upload attachments
  const existingIssue = await db
    .select()
    .from(messIssues)
    .where(eq(messIssues.id, issueId))
    .limit(1);

  if (existingIssue.length == 0) {
    throw new Error("Issue not found");
  }

  if (existingIssue[0].userId !== uploadedBy) {
    throw new Error(
      "Unauthorized: You are not authorized to upload attachments for this issue",
    );
  }

  //Parallel upload to cloudinary
  const uploadPromises = files.map((files) => {
    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "hostel-mess-issues",
        },
        (error, result) => {
          if (error || !result) {
            reject(error);
          } else {
            resolve({ url: result.url, publicId: result.public_id });
          }
        },
      );
      uploadStream.end(files.buffer);
    });
  });

  // Wait for ALL uploads to finish
  const uploadedResults = await Promise.all(uploadPromises);

  // 3. Batch Insert into Database
  // Instead of inserting one by one, we insert all at once
  const records = await db
    .insert(messIssueAttachments)
    .values(
      uploadedResults.map((img) => ({
        issueId,
        uploadedBy,
        fileURL: img.url,
        publicId: img.publicId,
      })),
    )
    .returning();

  return records;
};
