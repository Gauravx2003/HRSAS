import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  borrowBook,
  checkDigitalAccess,
  getAllBooks,
  returnBook,
} from "./library.service";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getBooksController = async (req: Authenticate, res: Response) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId));
    if (!user || !user.hostelId) {
      return res.status(400).json({ message: "User not assigned to a hostel" });
    }
    const books = await getAllBooks(user.hostelId);
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const downloadBookController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { bookId } = req.params;
    const url = await checkDigitalAccess(req.user!.userId, bookId);
    res.status(200).json({ downloadUrl: url });
  } catch (err: any) {
    res.status(403).json({ message: err.message });
  }
};

export const borrowBookController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { bookId } = req.body;
    const result = await borrowBook(req.user!.userId, bookId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const returnBookController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { transactionId } = req.body;
    const result = await returnBook(transactionId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
