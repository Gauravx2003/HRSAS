import { Response } from "express";
import { Authenticate } from "../../middleware/auth";
import { createNotice, getAllNotices } from "./notices.service";

export const createNoticeController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { title, content, expiresAt } = req.body;

    if (!title || !content || !expiresAt) {
      return res.status(400).json({ message: "Bad Request" });
    }

    const notice = await createNotice(
      title,
      content,
      new Date(expiresAt),
      req.user!.userId
    );

    return res.status(201).json(notice);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllNoticesController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const notices = await getAllNotices();
    return res.status(200).json(notices);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
