import { db } from "../../db";
import { notices } from "../../db/schema";

export const createNotice = async (
  title: string,
  content: string,
  expiresAt: Date,
  createdBy: string
) => {
  const notice = await db.insert(notices).values({
    title,
    content,
    expiresAt,
    createdBy,
  });

  return notice;
};

export const getAllNotices = async () => {
  const notice = await db.select().from(notices);
  return notice;
};
