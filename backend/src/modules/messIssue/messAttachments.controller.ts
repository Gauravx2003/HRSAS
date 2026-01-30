import { Response } from "express";
import { Authenticate } from "../../middleware/auth";
import { uploadMessIssueAttachment } from "./messAttachments.service";

export async function addMessIssueAttachments(
  req: Authenticate,
  res: Response,
) {
  try {
    const { issueId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploaded = await uploadMessIssueAttachment(
      files,
      req.user!.userId,
      issueId,
    );

    res.status(201).json(uploaded);
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
}
