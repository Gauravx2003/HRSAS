import cron from "node-cron";
import { db } from "../db";
import {
  libraryTransactions,
  users,
  libraryPlans,
  libraryMemberships,
  bookReservations, // <-- NEW
  libraryBooks, // <-- NEW
} from "../db/schema";
import { eq, and, lt, inArray, sql } from "drizzle-orm"; // Make sure to import sql

export const startLibraryCron = () => {
  // ============================================================================
  // JOB 1: DAILY OVERDUE CHECK (Runs every day at Midnight - 00:00)
  // ============================================================================
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running Library Overdue Check...");

    try {
      const now = new Date();

      const overdueTransactions = await db
        .select()
        .from(libraryTransactions)
        .where(
          and(
            inArray(libraryTransactions.status, ["BORROWED", "OVERDUE"]),
            lt(libraryTransactions.dueDate, now),
          ),
        );

      if (overdueTransactions.length === 0) {
        console.log("✅ No overdue books found.");
        return;
      }

      console.log(`⚠️ Processing ${overdueTransactions.length} overdue books.`);

      for (const tx of overdueTransactions) {
        const [membership] = await db
          .select({
            finePerDay: libraryPlans.finePerDay,
          })
          .from(libraryMemberships)
          .innerJoin(
            libraryPlans,
            eq(libraryMemberships.planId, libraryPlans.id),
          )
          .where(eq(libraryMemberships.userId, tx.userId));

        const dailyFine = membership?.finePerDay || 0;

        await db
          .update(libraryTransactions)
          .set({
            status: "OVERDUE",
            fineAmount: (tx.fineAmount || 0) + dailyFine,
          })
          .where(eq(libraryTransactions.id, tx.id));

        if (tx.status === "BORROWED") {
          // Optional: Trigger push notification to user here
        }
      }
    } catch (error) {
      console.error("❌ Library Overdue Cron Failed:", error);
    }
  });

  // ============================================================================
  // JOB 2: HOURLY RESERVATION EXPIRY (Runs at minute 0 past every hour)
  // ============================================================================
  cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running Library Reservation Expiry Check...");

    try {
      const now = new Date();

      // 1. Find reservations that are still pending but past their expiry time
      const expiredReservations = await db
        .select()
        .from(bookReservations)
        .where(
          and(
            eq(bookReservations.status, "RESERVED"),
            lt(bookReservations.expiresAt, now),
          ),
        );

      if (expiredReservations.length === 0) {
        return; // Silent return to keep logs clean
      }

      console.log(
        `⚠️ Reclaiming ${expiredReservations.length} expired reservations.`,
      );

      // 2. Process each expired ticket safely in a transaction
      for (const res of expiredReservations) {
        await db.transaction(async (tx) => {
          // A. Void the ticket
          await tx
            .update(bookReservations)
            .set({ status: "EXPIRED" })
            .where(eq(bookReservations.id, res.id));

          // B. Put the book back on the shelf
          // TODO: With the new `bookCopies` schema, `bookReservations` needs to be updated
          // to either reserve a specific `copyId` or we simply don't need to do anything here
          // since available copies is calculated dynamically from `bookCopies` and `libraryTransactions`.
        });
      }

      console.log(
        `✅ Successfully expired ${expiredReservations.length} reservations.`,
      );
    } catch (error) {
      console.error("❌ Reservation Expiry Cron Failed:", error);
    }
  });
};
