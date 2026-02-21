import cron from "node-cron";
import { db } from "../db";
import { bookings } from "../db/schema";
import { eq, and, lt } from "drizzle-orm";
import { cancelAndAutoAssign } from "../modules/orchestrator/orchestrator.service";

export const startOrchestratorCron = () => {
  // Runs every single minute (* * * * *)
  cron.schedule("* * * * *", async () => {
    try {
      const GRACE_PERIOD_MINUTES = 15;
      const now = new Date();

      // Calculate the exact cutoff time (15 minutes ago)
      const cutoffTime = new Date(now.getTime() - GRACE_PERIOD_MINUTES * 60000);

      // 1. Find all bookings that are CONFIRMED (not started)
      // where the startTime has passed the 15-minute grace period
      const expiredBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "CONFIRMED"),
            lt(bookings.startTime, cutoffTime),
          ),
        );

      if (expiredBookings.length === 0) return; // Silent return to avoid log spam

      console.log(
        `⚠️ Orchestrator: Found ${expiredBookings.length} users who missed their grace period. Forfeiting slots...`,
      );

      // 2. Process each forfeiture
      for (const booking of expiredBookings) {
        try {
          // We reuse the exact same function we wrote earlier!
          // This will cancel the booking, check the 25-minute threshold,
          // and auto-assign to the waitlist if applicable.
          await cancelAndAutoAssign(booking.id);

          console.log(`✅ Forfeited booking ${booking.id} successfully.`);

          // Optional: Send a notification to the user who lost their slot
          // sendPushNotification(booking.userId, "Slot Forfeited ⏰", "You missed your 15-minute grace period. Your machine has been given to the next person.");
        } catch (innerError) {
          console.error(
            `❌ Failed to forfeit booking ${booking.id}:`,
            innerError,
          );
          // We catch errors individually so one failed cancellation
          // doesn't stop the loop from cancelling the others.
        }
      }
    } catch (error) {
      console.error("❌ Orchestrator Cron Failed:", error);
    }
  });
};
