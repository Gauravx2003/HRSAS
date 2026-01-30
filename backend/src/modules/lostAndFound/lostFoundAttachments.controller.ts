import { Response } from "express";
import { Authenticate } from "../../middleware/auth";
import { uploadLostFoundAttachment } from "./lostFoundAttachments.service";

export async function addLostFoundAttachments(
  req: Authenticate,
  res: Response,
) {
  try {
    const { itemId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const records = await uploadLostFoundAttachment(
      files,
      req.user!.userId,
      itemId,
    );

    return res.status(201).json(records);
  } catch (error: any) {
    console.error("Error uploading attachments:", error);
    return res.status(500).json({
      error: error.message || "Failed to upload attachments",
    });
  }
}
