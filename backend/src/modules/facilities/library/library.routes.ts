import { Router } from "express";
import { authenticate, authorize } from "../../../middleware/auth";
import {
  searchResidentsController,
  checkEligibilityController,
  searchBooksController,
  getAvailableCopiesController,
  issueBookController,
  getBorrowedBooksController,
  returnBookController,
  getAllTitlesController,
  createTitleController,
  getCopiesForTitleController,
  addCopiesController,
  discardCopyController,
  getCopiesByStatusController,
  reactivateCopyController,
  getStatsController,
  getTopOverduesController,
  getInventoryHealthController,
  getAllBooksResidentController,
  getMyBooksResidentController,
  reserveBookResidentController,
  downloadBookResidentController,
} from "./library.controller";

const router = Router();
const librarianAuth = [authenticate, authorize(["LIBRARIAN", "ADMIN"])];
const residentAuth = [
  authenticate,
  authorize(["RESIDENT", "LIBRARIAN", "ADMIN"]),
];

// ─── RESIDENT API ──────────────────────────────────────────
router.get("/", ...residentAuth, getAllBooksResidentController);
router.get("/my", ...residentAuth, getMyBooksResidentController);
router.post("/reserve", ...residentAuth, reserveBookResidentController);
router.get(
  "/:bookId/download",
  ...residentAuth,
  downloadBookResidentController,
);

// ─── LIBRARIAN API ─────────────────────────────────────────
router.get("/search-residents", ...librarianAuth, searchResidentsController);
router.get(
  "/eligibility/:userId",
  ...librarianAuth,
  checkEligibilityController,
);

// Issue Desk
router.get("/search-books", ...librarianAuth, searchBooksController);
router.get("/copies/:bookId", ...librarianAuth, getAvailableCopiesController);
router.post("/issue", ...librarianAuth, issueBookController);

// Return Desk
router.get("/borrowed/:userId", ...librarianAuth, getBorrowedBooksController);
router.post("/return-desk", ...librarianAuth, returnBookController);

// Inventory
router.get("/titles", ...librarianAuth, getAllTitlesController);
router.post("/titles", ...librarianAuth, createTitleController);
router.get(
  "/titles/:bookId/copies",
  ...librarianAuth,
  getCopiesForTitleController,
);
router.post("/titles/:bookId/copies", ...librarianAuth, addCopiesController);
router.patch(
  "/copies/:copyId/discard",
  ...librarianAuth,
  discardCopyController,
);
router.get("/copies-by-status", ...librarianAuth, getCopiesByStatusController);
router.patch(
  "/copies/:copyId/reactivate",
  ...librarianAuth,
  reactivateCopyController,
);

// Dashboard Analytics
router.get("/dashboard/stats", ...librarianAuth, getStatsController);
router.get("/dashboard/overdues", ...librarianAuth, getTopOverduesController);
router.get("/dashboard/health", ...librarianAuth, getInventoryHealthController);

export default router;
