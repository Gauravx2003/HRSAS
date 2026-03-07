import { db } from "../../../db";
import {
  libraryBooks,
  bookCopies,
  libraryTransactions,
  libraryMemberships,
  libraryPlans,
  users,
  residentProfiles,
  rooms,
  payments,
  bookReservations,
} from "../../../db/schema";
import {
  eq,
  and,
  or,
  gt,
  lt,
  desc,
  asc,
  sql,
  ilike,
  isNull,
  count,
  inArray,
  notExists,
} from "drizzle-orm";
import { createPayment } from "../../finance/finesAndPayments/finesAndPayments.service";

// ─── RESIDENT SEARCH & ELIGIBILITY ──────────────────────────

export const searchResidents = async (hostelId: string, query: string) => {
  if (!query || query.trim().length < 2) return [];

  const q = `%${query.trim()}%`;

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      roomNumber: rooms.roomNumber,
    })
    .from(users)
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .where(
      and(
        eq(users.hostelId, hostelId),
        eq(users.role, "RESIDENT"),
        eq(users.isActive, true),
        or(
          ilike(users.name, q),
          ilike(users.email, q),
          ilike(rooms.roomNumber, q),
        ),
      ),
    )
    .limit(10);

  return results;
};

export const checkBorrowEligibility = async (userId: string) => {
  // 1. Check active membership
  const [membership] = await db
    .select({
      id: libraryMemberships.id,
      planId: libraryMemberships.planId,
      endDate: libraryMemberships.endDate,
    })
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

  if (!membership) {
    return {
      eligible: false,
      reason: "No active library membership",
    };
  }

  // 2. Get plan limits
  const [plan] = await db
    .select()
    .from(libraryPlans)
    .where(eq(libraryPlans.id, membership.planId));

  const maxBooks = plan?.maxBooksAllowed ?? 2;

  // 3. Count current borrows
  const [{ borrowCount }] = await db
    .select({ borrowCount: count() })
    .from(libraryTransactions)
    .where(
      and(
        eq(libraryTransactions.userId, userId),
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
      ),
    );

  if (Number(borrowCount) >= maxBooks) {
    return {
      eligible: false,
      reason: `Maximum limit reached (${borrowCount}/${maxBooks})`,
    };
  }

  // 4. Check for overdue books
  const [overdueBook] = await db
    .select({
      title: libraryBooks.title,
    })
    .from(libraryTransactions)
    .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(
      and(
        eq(libraryTransactions.userId, userId),
        eq(libraryTransactions.status, "BORROWED"),
        lt(libraryTransactions.dueDate, new Date()),
      ),
    )
    .limit(1);

  if (overdueBook) {
    return {
      eligible: false,
      reason: `Has overdue book (${overdueBook.title})`,
    };
  }

  // 5. Check for unpaid library fines
  const [unpaidFine] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.residentId, userId),
        eq(payments.category, "LIBRARY_FINE"),
        eq(payments.status, "PENDING"),
      ),
    )
    .limit(1);

  if (unpaidFine) {
    return {
      eligible: false,
      reason: "Has unpaid library fine",
    };
  }

  return {
    eligible: true,
    reason: null,
    currentBorrows: Number(borrowCount),
    maxBooks,
    membershipId: membership.id,
    finePerDay: plan?.finePerDay ?? 10,
  };
};

// ─── ISSUE DESK ─────────────────────────────────────────────

export const searchBooks = async (hostelId: string, query: string) => {
  if (!query || query.trim().length < 2) return [];

  const q = `%${query.trim()}%`;

  // 1. Prepare Subquery for Total Copies
  const sqTotalCopies = db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookCopies)
    .where(eq(bookCopies.bookId, libraryBooks.id));

  // 2. Prepare Subquery for Available Copies
  const sqAvailableCopies = db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookCopies)
    .where(
      and(
        eq(bookCopies.bookId, libraryBooks.id),
        eq(bookCopies.status, "ACTIVE"),
        notExists(
          db
            .select({ _: sql`1` }) // SELECT 1
            .from(libraryTransactions)
            .where(
              and(
                eq(libraryTransactions.copyId, bookCopies.id),
                inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
              ),
            ),
        ),
      ),
    );

  const results = await db
    .select({
      id: libraryBooks.id,
      title: libraryBooks.title,
      author: libraryBooks.author,
      isbn: libraryBooks.isbn,
      category: libraryBooks.category,
      coverUrl: libraryBooks.coverUrl,
      totalCopies: sql<number>`(${sqTotalCopies})`,
      availableCopies: sql<number>`(${sqAvailableCopies})`,
    })
    .from(libraryBooks)
    .where(
      and(
        or(eq(libraryBooks.hostelId, hostelId), isNull(libraryBooks.hostelId)),
        or(
          ilike(libraryBooks.title, q),
          ilike(libraryBooks.author, q),
          ilike(libraryBooks.isbn, q),
        ),
      ),
    )
    .limit(15);

  return results;
};

export const getAvailableCopies = async (bookId: string) => {
  return await db
    .select({
      id: bookCopies.id,
      status: bookCopies.status,
      createdAt: bookCopies.createdAt,
    })
    .from(bookCopies)
    .where(and(eq(bookCopies.bookId, bookId), eq(bookCopies.status, "ACTIVE")));
};

export const issueBook = async (userId: string, copyId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Lock the copy row
    const [copy] = await tx
      .select()
      .from(bookCopies)
      .where(eq(bookCopies.id, copyId))
      .for("update");

    if (!copy || copy.status !== "ACTIVE") {
      throw new Error("This copy is not available for issue");
    }

    // 2. Duplicate ISBN blocker — check if user already has a copy of the same title
    const [existing] = await tx
      .select({ id: libraryTransactions.id })
      .from(libraryTransactions)
      .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
      .where(
        and(
          eq(libraryTransactions.userId, userId),
          eq(bookCopies.bookId, copy.bookId),
          inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("Resident already has a copy of this title checked out");
    }

    // 3. Create transaction
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + 14);

    const [transaction] = await tx
      .insert(libraryTransactions)
      .values({
        userId,
        copyId,
        issueDate,
        dueDate,
        status: "BORROWED",
      })
      .returning();

    // 4. Mark copy as borrowed (we track this via transaction status, but we can also update the copy)
    // Since bookCopies.status tracks physical condition, and BORROWED isn't in the enum,
    // we'll track borrowing state via libraryTransactions only.
    // The copy status stays ACTIVE (physically fine) — availability is computed from transactions.

    return transaction;
  });
};

// ─── RETURN DESK ────────────────────────────────────────────

export const getBorrowedBooks = async (userId: string) => {
  const now = new Date();

  const results = await db
    .select({
      transactionId: libraryTransactions.id,
      copyId: libraryTransactions.copyId,
      issueDate: libraryTransactions.issueDate,
      dueDate: libraryTransactions.dueDate,
      status: libraryTransactions.status,
      bookTitle: libraryBooks.title,
      bookAuthor: libraryBooks.author,
      bookIsbn: libraryBooks.isbn,
      bookId: libraryBooks.id,
    })
    .from(libraryTransactions)
    .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(
      and(
        eq(libraryTransactions.userId, userId),
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
      ),
    )
    .orderBy(asc(libraryTransactions.dueDate));

  // Augment with overdue info
  return results.map((r) => ({
    ...r,
    isOverdue: r.dueDate < now,
    daysOverdue:
      r.dueDate < now
        ? Math.ceil(
            (now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0,
  }));
};

export const returnBook = async (
  transactionId: string,
  condition: "GOOD" | "DAMAGED" | "LOST" = "GOOD",
  payFineNow: boolean = false,
) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch transaction
    const [transaction] = await tx
      .select()
      .from(libraryTransactions)
      .where(eq(libraryTransactions.id, transactionId));

    if (
      !transaction ||
      !transaction.status ||
      !["BORROWED", "OVERDUE"].includes(transaction.status)
    ) {
      throw new Error("Invalid transaction or book already returned");
    }

    const returnDate = new Date();
    let fineAmount = 0;
    let diffDays = 0;

    // 2. Calculate fine
    if (returnDate > transaction.dueDate) {
      const diffTime = Math.abs(
        returnDate.getTime() - transaction.dueDate.getTime(),
      );
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Get user's plan for fine rate
      const [membership] = await tx
        .select()
        .from(libraryMemberships)
        .where(eq(libraryMemberships.userId, transaction.userId))
        .orderBy(desc(libraryMemberships.endDate))
        .limit(1);

      let finePerDay = 10;
      if (membership) {
        const [plan] = await tx
          .select()
          .from(libraryPlans)
          .where(eq(libraryPlans.id, membership.planId));
        if (plan?.finePerDay) finePerDay = plan.finePerDay;
      }

      fineAmount = diffDays * finePerDay;
    }

    // 3. Update transaction
    await tx
      .update(libraryTransactions)
      .set({
        returnDate,
        status: "RETURNED",
        fineAmount,
        isFinePaid: fineAmount === 0 ? true : payFineNow,
      })
      .where(eq(libraryTransactions.id, transactionId));

    // 4. Update copy status based on condition
    let newCopyStatus: "ACTIVE" | "MAINTENANCE" | "LOST_FOREVER" = "ACTIVE";
    if (condition === "DAMAGED") newCopyStatus = "MAINTENANCE";
    if (condition === "LOST") newCopyStatus = "LOST_FOREVER";

    await tx
      .update(bookCopies)
      .set({ status: newCopyStatus })
      .where(eq(bookCopies.id, transaction.copyId));

    // 5. Create fine payment if overdue
    if (fineAmount > 0) {
      await createPayment(
        transaction.userId,
        fineAmount,
        "LIBRARY_FINE",
        `Library Fine: ${diffDays} days late`,
        undefined,
      );
    }

    return { message: "Book returned successfully", fineAmount, condition };
  });
};

// ─── INVENTORY ──────────────────────────────────────────────

export const getAllTitles = async (hostelId: string) => {
  // 1. Prepare Subquery for Total Copies
  const sqTotalCopies = db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookCopies)
    .where(eq(bookCopies.bookId, libraryBooks.id));

  // 2. Prepare Subquery for Available Copies
  const sqAvailableCopies = db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookCopies)
    .where(
      and(
        eq(bookCopies.bookId, libraryBooks.id),
        eq(bookCopies.status, "ACTIVE"),
        notExists(
          db
            .select({ _: sql`1` }) // SELECT 1
            .from(libraryTransactions)
            .where(
              and(
                eq(libraryTransactions.copyId, bookCopies.id),
                inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
              ),
            ),
        ),
      ),
    );

  return await db
    .select({
      id: libraryBooks.id,
      title: libraryBooks.title,
      author: libraryBooks.author,
      isbn: libraryBooks.isbn,
      category: libraryBooks.category,
      coverUrl: libraryBooks.coverUrl,
      totalCopies: sql<number>`(${sqTotalCopies})`,
      availableCopies: sql<number>`(${sqAvailableCopies})`,
    })
    .from(libraryBooks)
    .where(
      or(eq(libraryBooks.hostelId, hostelId), isNull(libraryBooks.hostelId)),
    )
    .orderBy(asc(libraryBooks.title));
};

export const createTitle = async (data: {
  title: string;
  author: string;
  isbn?: string;
  category: string;
  coverUrl?: string;
  hostelId?: string;
  organizationId: string;
}) => {
  const [book] = await db
    .insert(libraryBooks)
    .values({
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      category: data.category,
      coverUrl: data.coverUrl,
      hostelId: data.hostelId,
      organizationId: data.organizationId,
    })
    .returning();

  return book;
};

export const getCopiesForTitle = async (bookId: string) => {
  const copies = await db
    .select({
      id: bookCopies.id,
      status: bookCopies.status,
      createdAt: bookCopies.createdAt,
      currentBorrower: users.name,
      currentBorrowerRoom: rooms.roomNumber,
      transactionStatus: libraryTransactions.status,
    })
    .from(bookCopies)
    .leftJoin(
      libraryTransactions,
      and(
        eq(bookCopies.id, libraryTransactions.copyId),
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
      ),
    )
    .leftJoin(users, eq(libraryTransactions.userId, users.id))
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .where(eq(bookCopies.bookId, bookId))
    .orderBy(asc(bookCopies.createdAt));

  return copies;
};

export const addCopies = async (bookId: string, count: number) => {
  const values = Array.from({ length: count }, () => ({
    bookId,
    status: "ACTIVE" as const,
  }));

  const inserted = await db.insert(bookCopies).values(values).returning();
  return inserted;
};

export const discardCopy = async (copyId: string) => {
  // Check it's not currently borrowed
  const [activeTx] = await db
    .select({ id: libraryTransactions.id })
    .from(libraryTransactions)
    .where(
      and(
        eq(libraryTransactions.copyId, copyId),
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
      ),
    )
    .limit(1);

  if (activeTx) {
    throw new Error("Cannot discard a copy that is currently borrowed");
  }

  const [updated] = await db
    .update(bookCopies)
    .set({ status: "LOST_FOREVER" })
    .where(eq(bookCopies.id, copyId))
    .returning();

  return updated;
};

// ─── DASHBOARD ANALYTICS ────────────────────────────────────

export const getLibraryStats = async (hostelId: string) => {
  // Get book IDs for this hostel
  const hostelCondition = or(
    eq(libraryBooks.hostelId, hostelId),
    isNull(libraryBooks.hostelId),
  );

  const [titleCount] = await db
    .select({ count: count() })
    .from(libraryBooks)
    .where(hostelCondition);

  const [copyCount] = await db
    .select({ count: count() })
    .from(bookCopies)
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(hostelCondition);

  const [borrowedCount] = await db
    .select({ count: count() })
    .from(libraryTransactions)
    .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(
      and(
        hostelCondition,
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
      ),
    );

  const now = new Date();
  const [overdueCount] = await db
    .select({ count: count() })
    .from(libraryTransactions)
    .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(
      and(
        hostelCondition,
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
        lt(libraryTransactions.dueDate, now),
      ),
    );

  return {
    totalTitles: Number(titleCount.count),
    totalCopies: Number(copyCount.count),
    currentlyOut: Number(borrowedCount.count),
    activeOverdues: Number(overdueCount.count),
  };
};

export const getTopOverdues = async (hostelId: string) => {
  const now = new Date();

  return await db
    .select({
      transactionId: libraryTransactions.id,
      residentName: users.name,
      residentEmail: users.email,
      roomNumber: rooms.roomNumber,
      bookTitle: libraryBooks.title,
      dueDate: libraryTransactions.dueDate,
      daysLate:
        sql<number>`EXTRACT(DAY FROM NOW() - ${libraryTransactions.dueDate})::int`.mapWith(
          Number,
        ),
    })
    .from(libraryTransactions)
    .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .innerJoin(users, eq(libraryTransactions.userId, users.id))
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .where(
      and(
        or(eq(libraryBooks.hostelId, hostelId), isNull(libraryBooks.hostelId)),
        inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
        lt(libraryTransactions.dueDate, now),
      ),
    )
    .orderBy(asc(libraryTransactions.dueDate))
    .limit(10);
};

export const getInventoryHealth = async (hostelId: string) => {
  const hostelCondition = or(
    eq(libraryBooks.hostelId, hostelId),
    isNull(libraryBooks.hostelId),
  );

  // Get all copies for this hostel's books
  const allCopies = await db
    .select({
      status: bookCopies.status,
      copyId: bookCopies.id,
    })
    .from(bookCopies)
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(hostelCondition);

  // Get which copies are currently borrowed
  const borrowedCopyIds = await db
    .select({ copyId: libraryTransactions.copyId })
    .from(libraryTransactions)
    .where(inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]));

  const borrowedSet = new Set(borrowedCopyIds.map((b) => b.copyId));

  let available = 0;
  let borrowed = 0;
  let maintenance = 0;
  let lost = 0;

  for (const copy of allCopies) {
    if (borrowedSet.has(copy.copyId)) {
      borrowed++;
    } else if (copy.status === "ACTIVE") {
      available++;
    } else if (copy.status === "MAINTENANCE" || copy.status === "ARCHIVED") {
      maintenance++;
    } else if (copy.status === "LOST_FOREVER") {
      lost++;
    }
  }

  return [
    { name: "Available", value: available },
    { name: "Borrowed", value: borrowed },
    { name: "Damaged/Maintenance", value: maintenance },
    { name: "Lost", value: lost },
  ];
};

// ─── RESIDENT API (MOBILE APP) ─────────────────────────────

export const getAllBooksResident = async (hostelId: string) => {
  return await db
    .select({
      id: libraryBooks.id,
      title: libraryBooks.title,
      author: libraryBooks.author,
      isbn: libraryBooks.isbn,
      category: libraryBooks.category,
      coverUrl: libraryBooks.coverUrl,
      isDigital: sql<boolean>`false`, // Mock for backward compatibility
      format: sql<string>`'PHYSICAL'`,
      availableCopies: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${bookCopies} 
        WHERE ${bookCopies.bookId} = ${libraryBooks.id}
        AND ${bookCopies.status} = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM ${libraryTransactions} 
          WHERE ${libraryTransactions.copyId} = ${bookCopies.id}
          AND ${libraryTransactions.status} IN ('BORROWED', 'OVERDUE')
        )
      )`.mapWith(Number),
    })
    .from(libraryBooks)
    .where(
      or(eq(libraryBooks.hostelId, hostelId), isNull(libraryBooks.hostelId)),
    )
    .orderBy(asc(libraryBooks.title));
};

export const getMyBooksResident = async (
  userId: string,
  status: "BORROWED" | "RETURNED" | "OVERDUE" | "ALL",
) => {
  const conditions: any[] = [eq(libraryTransactions.userId, userId)];
  if (status !== "ALL") {
    conditions.push(eq(libraryTransactions.status, status));
  }

  const transactions = await db
    .select({
      id: libraryTransactions.id,
      bookId: libraryBooks.id,
      title: libraryBooks.title,
      author: libraryBooks.author,
      isbn: libraryBooks.isbn,
      category: libraryBooks.category,
      coverUrl: libraryBooks.coverUrl,
      isDigital: sql<boolean>`false`,
      format: sql<string>`'PHYSICAL'`,
      issueDate: libraryTransactions.issueDate,
      dueDate: libraryTransactions.dueDate,
      returnDate: libraryTransactions.returnDate,
      fineAmount: libraryTransactions.fineAmount,
      isFinePaid: libraryTransactions.isFinePaid,
      transactionStatus: libraryTransactions.status,
    })
    .from(libraryTransactions)
    .innerJoin(bookCopies, eq(libraryTransactions.copyId, bookCopies.id))
    .innerJoin(libraryBooks, eq(bookCopies.bookId, libraryBooks.id))
    .where(and(...conditions));

  const reservations = await db
    .select({
      id: bookReservations.id,
      bookId: bookReservations.bookId,
      status: bookReservations.status,
      reservedAt: bookReservations.reservedAt,
      expiresAt: bookReservations.expiresAt,
      bookDetails: {
        id: libraryBooks.id,
        title: libraryBooks.title,
        author: libraryBooks.author,
        coverUrl: libraryBooks.coverUrl,
      },
    })
    .from(bookReservations)
    .innerJoin(libraryBooks, eq(bookReservations.bookId, libraryBooks.id))
    .where(
      and(
        eq(bookReservations.userId, userId),
        inArray(bookReservations.status, ["RESERVED", "EXPIRED"]),
      ),
    );

  return { transactions, reservations };
};

export const reserveBookResident = async (userId: string, bookId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Check Membership
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
      .limit(1);

    if (!membership)
      throw new Error("Active Library Membership required to reserve books.");

    // 2. Check Plan Limits
    const activeReservations = await tx
      .select()
      .from(bookReservations)
      .where(
        and(
          eq(bookReservations.userId, userId),
          eq(bookReservations.status, "RESERVED"),
        ),
      );

    const activeBorrows = await tx
      .select()
      .from(libraryTransactions)
      .where(
        and(
          eq(libraryTransactions.userId, userId),
          eq(libraryTransactions.status, "BORROWED"),
        ),
      );

    const [plan] = await tx
      .select()
      .from(libraryPlans)
      .where(eq(libraryPlans.id, membership.planId));

    const totalActive = activeReservations.length + activeBorrows.length;
    if (plan?.maxBooksAllowed && totalActive >= plan.maxBooksAllowed) {
      throw new Error(
        `Limit reached. You can only have ${plan.maxBooksAllowed} books reserved/borrowed.`,
      );
    }

    // 3. Check for existing reservation
    const [existingReservation] = await tx
      .select()
      .from(bookReservations)
      .where(
        and(
          eq(bookReservations.userId, userId),
          eq(bookReservations.bookId, bookId),
          eq(bookReservations.status, "RESERVED"),
        ),
      )
      .limit(1);

    if (existingReservation)
      throw new Error("You have already reserved this book.");

    // 4. Create reservation
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const [reservation] = await tx
      .insert(bookReservations)
      .values({
        userId,
        bookId,
        status: "RESERVED",
        expiresAt,
      })
      .returning();

    return reservation;
  });
};

export const downloadBookResident = async (userId: string, bookId: string) => {
  throw new Error(
    "Digital books are currently unavailable in the new library system.",
  );
};
