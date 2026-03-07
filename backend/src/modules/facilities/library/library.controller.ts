import { Authenticate } from "../../../middleware/auth";
import { Response } from "express";
import {
  searchResidents,
  checkBorrowEligibility,
  searchBooks,
  getAvailableCopies,
  issueBook,
  getBorrowedBooks,
  returnBook,
  getAllTitles,
  createTitle,
  getCopiesForTitle,
  addCopies,
  discardCopy,
  getLibraryStats,
  getTopOverdues,
  getInventoryHealth,
  getAllBooksResident,
  getMyBooksResident,
  reserveBookResident,
  downloadBookResident,
} from "./library.service";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

// Helper to get hostelId from request user
const getHostelId = async (req: Authenticate) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user!.userId));
  if (!user?.hostelId) throw new Error("User not assigned to a hostel");
  return { hostelId: user.hostelId, organizationId: user.organizationId };
};

// ─── RESIDENT SEARCH & ELIGIBILITY ──────────────────

export const searchResidentsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = await getHostelId(req);
    const query = (req.query.q as string) || "";
    const results = await searchResidents(hostelId, query);
    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const checkEligibilityController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { userId } = req.params;
    const result = await checkBorrowEligibility(userId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

// ─── ISSUE DESK ─────────────────────────────────────

export const searchBooksController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = await getHostelId(req);
    const query = (req.query.q as string) || "";
    const results = await searchBooks(hostelId, query);
    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const getAvailableCopiesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { bookId } = req.params;
    const copies = await getAvailableCopies(bookId);
    res.status(200).json(copies);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const issueBookController = async (req: Authenticate, res: Response) => {
  try {
    const { userId, copyId } = req.body;
    if (!userId || !copyId) {
      return res
        .status(400)
        .json({ message: "userId and copyId are required" });
    }
    const result = await issueBook(userId, copyId);
    res
      .status(201)
      .json({ message: "Book issued successfully", transaction: result });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── RETURN DESK ────────────────────────────────────

export const getBorrowedBooksController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { userId } = req.params;
    const books = await getBorrowedBooks(userId);
    res.status(200).json(books);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const returnBookController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { transactionId, condition, payFineNow } = req.body;
    if (!transactionId) {
      return res.status(400).json({ message: "transactionId is required" });
    }
    const result = await returnBook(transactionId, condition, payFineNow);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── INVENTORY ──────────────────────────────────────

export const getAllTitlesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = await getHostelId(req);
    const titles = await getAllTitles(hostelId);
    res.status(200).json(titles);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const createTitleController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId, organizationId } = await getHostelId(req);
    const { title, author, isbn, category, coverUrl } = req.body;
    if (!title || !author || !category) {
      return res
        .status(400)
        .json({ message: "title, author, and category are required" });
    }
    const book = await createTitle({
      title,
      author,
      isbn,
      category,
      coverUrl,
      hostelId,
      organizationId,
    });
    res.status(201).json(book);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getCopiesForTitleController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { bookId } = req.params;
    const copies = await getCopiesForTitle(bookId);
    res.status(200).json(copies);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const addCopiesController = async (req: Authenticate, res: Response) => {
  try {
    const { bookId } = req.params;
    const { count } = req.body;
    if (!count || count < 1 || count > 50) {
      return res
        .status(400)
        .json({ message: "count must be between 1 and 50" });
    }
    const copies = await addCopies(bookId, count);
    res.status(201).json({ message: `${count} copies added`, copies });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const discardCopyController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { copyId } = req.params;
    const result = await discardCopy(copyId);
    res.status(200).json({ message: "Copy discarded", copy: result });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── DASHBOARD ANALYTICS ────────────────────────────

export const getStatsController = async (req: Authenticate, res: Response) => {
  try {
    const { hostelId } = await getHostelId(req);
    const stats = await getLibraryStats(hostelId);
    res.status(200).json(stats);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const getTopOverduesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = await getHostelId(req);
    const overdues = await getTopOverdues(hostelId);
    res.status(200).json(overdues);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const getInventoryHealthController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = await getHostelId(req);
    const health = await getInventoryHealth(hostelId);
    res.status(200).json(health);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

// ─── RESIDENT API CONTROLLERS ─────────────────────────────────

export const getAllBooksResidentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { hostelId } = await getHostelId(req);
    const books = await getAllBooksResident(hostelId);
    res.json(books);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBooksResidentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const status = (req.query.status as any) || "ALL";
    const data = await getMyBooksResident(userId, status);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const reserveBookResidentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const { bookId } = req.body;
    const reservation = await reserveBookResident(userId, bookId);
    res.json({ message: "Book reserved successfully", reservation });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const downloadBookResidentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const userId = req.user!.userId;
    const { bookId } = req.params;
    await downloadBookResident(userId, bookId);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
