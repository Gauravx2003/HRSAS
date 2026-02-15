import { db } from "../../db";
import {
  libraryBooks,
  libraryMemberships,
  libraryTransactions,
  libraryPlans,
  payments,
  users,
} from "../../db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { createPayment } from "../finesAndPayments/finesAndPayments.service";

// --- Book Listing ---

export const getAllBooks = async (hostelId: string) => {
  return await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.hostelId, hostelId));
};

export const getBookById = async (bookId: string) => {
  const [book] = await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.id, bookId));
  return book;
};

// --- Digital Access ---

export const checkDigitalAccess = async (userId: string, bookId: string) => {
  const [book] = await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.id, bookId));

  if (!book || !book.isDigital) {
    throw new Error("Book not found or is not digital");
  }

  // Check for ACTIVE membership
  // Must be ACTIVE and endDate > now
  const [membership] = await db
    .select()
    .from(libraryMemberships)
    .where(
      and(
        eq(libraryMemberships.userId, userId),
        eq(libraryMemberships.status, "ACTIVE"),
        gt(libraryMemberships.endDate, new Date()),
      ),
    )
    .orderBy(desc(libraryMemberships.endDate)) // Get latest if multiple
    .limit(1);

  if (!membership) {
    throw new Error("Active Library Membership required for digital access");
  }

  return book.downloadUrl;
};

// --- Borrowing & Returning ---

export const borrowBook = async (userId: string, bookId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Check if user has active membership (optional restriction: only members can borrow?)
    // Requirement didn't explicitly say PHYSICAL books need membership, but usually yes.
    // Let's assume yes for consistency, or maybe plans define "maxBooksAllowed".

    const [membership] = await tx
      .select()
      .from(libraryMemberships)
      .where(
        and(
          eq(libraryMemberships.userId, userId),
          eq(libraryMemberships.status, "ACTIVE"),
          gt(libraryMemberships.endDate, new Date()),
        ),
      )
      .orderBy(desc(libraryMemberships.endDate))
      .limit(1);

    if (!membership)
      throw new Error("Active Library Membership required to borrow books");

    // 2. Check Plan limits
    const [plan] = await tx
      .select()
      .from(libraryPlans)
      .where(eq(libraryPlans.id, membership.planId));

    // Count currently borrowed books
    const activeTransactions = await tx
      .select()
      .from(libraryTransactions)
      .where(
        and(
          eq(libraryTransactions.userId, userId),
          eq(libraryTransactions.status, "BORROWED"),
        ),
      );

    if (
      plan &&
      plan.maxBooksAllowed &&
      activeTransactions.length >= plan.maxBooksAllowed
    ) {
      throw new Error(
        `Plan limit reached. Max books allowed: ${plan.maxBooksAllowed}`,
      );
    }

    // 3. Create Transaction
    // Due Date = 14 days default (or from plan? Plan doesn't have duration per book, so 14 days default)
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + 14);

    await tx
      .update(libraryBooks)
      .set({ status: "BORROWED" })
      .where(eq(libraryBooks.id, bookId));

    const [transaction] = await tx
      .insert(libraryTransactions)
      .values({
        userId,
        bookId,
        issueDate,
        dueDate,
        status: "BORROWED",
      })
      .returning();

    return transaction;
  });
};

export const returnBook = async (transactionId: string) => {
  return await db.transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(libraryTransactions)
      .where(eq(libraryTransactions.id, transactionId));

    if (!transaction || transaction.status !== "BORROWED") {
      throw new Error("Invalid transaction or book already returned");
    }

    const returnDate = new Date();

    // 1. Calculate Fine
    let fineAmount = 0;
    if (returnDate > transaction.dueDate) {
      // Fetch Plan to get finePerDay
      // Need to find which membership was active/used?
      // Or just check user's current active plan?
      // Better to find the plan associated with the user.

      // We'll find the membership active AT THE TIME OF BORROWING or current.
      // Let's use current active membership for fine rules.
      const [membership] = await tx
        .select()
        .from(libraryMemberships)
        .where(
          and(
            eq(libraryMemberships.userId, transaction.userId),
            eq(libraryMemberships.status, "ACTIVE"),
          ),
        )
        .orderBy(desc(libraryMemberships.endDate))
        .limit(1);

      if (membership) {
        const [plan] = await tx
          .select()
          .from(libraryPlans)
          .where(eq(libraryPlans.id, membership.planId));
        if (plan && plan.finePerDay) {
          const diffTime = Math.abs(
            returnDate.getTime() - transaction.dueDate.getTime(),
          );
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          fineAmount = diffDays * plan.finePerDay;
        }
      } else {
        // Fallback default if no plan found (shouldn't happen if membership required)
        fineAmount =
          10 *
          Math.ceil(
            (returnDate.getTime() - transaction.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
      }
    }

    // 2. Update Transaction
    await tx
      .update(libraryTransactions)
      .set({
        returnDate,
        status: "AVAILABLE", // Transaction status isn't same as Book status enum, schema uses bookStatusEnum for transaction too?
        // schema says: status: bookStatusEnum("status").default("BORROWED") in libraryTransactions
        // Wait, libraryTransactions status should probably be "RETURNED"?
        // Schema: bookStatusEnum contains AVAILABLE, BORROWED, LOST, MAINTENANCE.
        // It doesn't have "RETURNED". So let's use "AVAILABLE" for transaction to indicate it's closed?
        // Or maybe we treat "status" in transaction as the state of the book allocation.
        // If returned, maybe we don't update status to AVAILABLE in transaction, but rather we rely on returnDate.
        // However, keeping it BORROWED is confusing.
        // ACTUALLY: The schema reuses `bookStatusEnum` for `libraryTransactions`.
        // bookStatusEnum: AVAILABLE, BORROWED, LOST, MAINTENANCE.
        // If I return it, the transaction is effectively closed. "AVAILABLE" seems wrong for a historical transaction record.
        // NOTE: Schema design might be slightly off here, but I will stick to "AVAILABLE" or just rely on `returnDate` being non-null.
        // Let's set it to AVAILABLE to imply "Closed/ returned".
        fineAmount,
      })
      .where(eq(libraryTransactions.id, transactionId));

    // 3. Update Book Status
    await tx
      .update(libraryBooks)
      .set({ status: "AVAILABLE" })
      .where(eq(libraryBooks.id, transaction.bookId));

    // 4. Create Payment for Fine if > 0
    if (fineAmount > 0) {
      await createPayment(
        transaction.userId,
        fineAmount,
        "LIBRARY_FINE",
        `Fine for late return of book (Tx: ${transactionId})`,
        transaction.userId, // System generated, but linked to user? Or maybe null if system? existing createPayment requires issuedBy string...
        // We'll use the user ID as "issuedBy" (self) or we need a system ID.
        // Existing createPayment: issuedBy is UUID.
        // I will use user ID for now to avoid FK error.
      );
    }

    return { message: "Book returned", fineAmount };
  });
};
