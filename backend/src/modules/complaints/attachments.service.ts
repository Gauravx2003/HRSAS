import cloudinary from "../../config/cloudinary";
import { db } from "../../db";
import { complaintAttachments } from "../../db/schema";

export const uploadAttachment = async (
  files: Express.Multer.File[],
  uploadedBy: string,
  complaintId: string
) => {
  const uploadedFiles = [];

  for (const file of files) {
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "hostel-complaints",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(file.buffer);
    });

    const [record] = await db
      .insert(complaintAttachments)
      .values({
        complaintId,
        uploadedBy,
        fileURL: result.secure_url,
        publicId: result.public_id,
      })
      .returning();

    uploadedFiles.push(record);
  }

  return uploadedFiles;
};
