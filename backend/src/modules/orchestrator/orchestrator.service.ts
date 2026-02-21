import { db } from "../../db";
import { bookings, resources, waitlists, users } from "../../db/schema";
import { eq, and, asc, inArray, gte, lte, lt } from "drizzle-orm";

/**
 * 0. GET RESOURCES WITH LIVE STATUS
 * Enriches each machine with AVAILABLE / IN_USE / MAINTENANCE based on active bookings.
 */
export const getResourcesWithStatus = async (hostelId: string) => {
  const now = new Date();

  // Get all LAUNDRY resources for this hostel
  const allResources = await db
    .select()
    .from(resources)
    .where(
      and(eq(resources.hostelId, hostelId), eq(resources.type, "LAUNDRY")),
    );

  // Get all active/confirmed bookings that overlap with "now"
  const activeBookings = await db
    .select({
      id: bookings.id,
      resourceId: bookings.resourceId,
      userId: bookings.userId,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      userName: users.name,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(
      and(
        inArray(bookings.status, ["CONFIRMED", "ACTIVE"]),
        lte(bookings.startTime, now),
        gte(bookings.endTime, now),
      ),
    );

  // Build a map: resourceId -> active booking
  const bookingMap = new Map<string, (typeof activeBookings)[0]>();
  for (const b of activeBookings) {
    bookingMap.set(b.resourceId, b);
  }

  // --- Calculate available slots today ---
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todaysBookings = await db
    .select({ resourceId: bookings.resourceId, startTime: bookings.startTime })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["CONFIRMED", "ACTIVE"]),
        gte(bookings.startTime, todayStart),
        lte(bookings.startTime, todayEnd),
      ),
    );

  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  if (now.getMinutes() > 0) start.setHours(start.getHours() + 1);

  let totalPossibleSlots = 0;
  for (let i = 0; i < 16; i++) {
    const slotStart = new Date(start.getTime() + i * 45 * 60000);
    if (slotStart.getHours() >= 23) break;
    totalPossibleSlots++;
  }

  const bookedSlotsPerMachine = new Map<string, number>();
  for (const b of todaysBookings) {
    if (b.startTime >= start) {
      bookedSlotsPerMachine.set(
        b.resourceId,
        (bookedSlotsPerMachine.get(b.resourceId) || 0) + 1,
      );
    }
  }
  // ---------------------------------------

  // Enrich each resource
  return allResources.map((r) => {
    const bookedCount = bookedSlotsPerMachine.get(r.id) || 0;
    const slotsLeft = Math.max(0, totalPossibleSlots - bookedCount);

    if (!r.isOperational) {
      return {
        ...r,
        liveStatus: "MAINTENANCE" as const,
        currentUser: null,
        availableAt: null,
        slotsLeft,
      };
    }

    const activeBooking = bookingMap.get(r.id);

    if (slotsLeft === 0 && !activeBooking) {
      return {
        ...r,
        liveStatus: "FULLY_BOOKED" as const,
        currentUser: "Booked out",
        availableAt: null,
        slotsLeft,
      };
    }

    if (activeBooking) {
      return {
        ...r,
        liveStatus: "IN_USE" as const,
        currentUser: activeBooking.userName || "Someone",
        availableAt: activeBooking.endTime,
        slotsLeft,
      };
    }

    return {
      ...r,
      liveStatus: "AVAILABLE" as const,
      currentUser: null,
      availableAt: null,
      slotsLeft,
    };
  });
};

/**
 * 0b. GET AVAILABLE SLOTS FOR A RESOURCE
 * Generates 45-min slots from the next full hour to 11 PM, filtering out booked ones.
 */
export const getAvailableSlots = async (resourceId: string) => {
  const now = new Date();

  // Start from the next full hour
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  if (now.getMinutes() > 0) start.setHours(start.getHours() + 1);

  // Generate all possible 45-min slots until 11 PM
  const allSlots: { startTime: Date; endTime: Date }[] = [];
  for (let i = 0; i < 16; i++) {
    const slotStart = new Date(start.getTime() + i * 45 * 60000);
    const slotEnd = new Date(slotStart.getTime() + 45 * 60000);
    if (slotStart.getHours() >= 23) break;
    allSlots.push({ startTime: slotStart, endTime: slotEnd });
  }

  // Query booked slots for this resource today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const bookedSlots = await db
    .select({ startTime: bookings.startTime })
    .from(bookings)
    .where(
      and(
        eq(bookings.resourceId, resourceId),
        inArray(bookings.status, ["CONFIRMED", "ACTIVE"]),
        gte(bookings.startTime, todayStart),
        lte(bookings.startTime, todayEnd),
      ),
    );

  const bookedTimes = new Set(bookedSlots.map((b) => b.startTime.getTime()));

  // Filter out booked slots
  return allSlots
    .filter((s) => !bookedTimes.has(s.startTime.getTime()))
    .map((s, i) => ({
      id: `slot-${i}`,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));
};
// Note: If you have a notification service, import it here
// import { sendPushNotification } from "../../services/notification.service";

/**
 * 1. THE HIGH-CONCURRENCY BOOKING ENGINE
 */
export const bookResourceSlot = async (
  userId: string,
  resourceId: string,
  startTime: Date,
  endTime: Date,
) => {
  // We wrap this entirely in a database transaction
  return await db.transaction(async (tx) => {
    // STEP 1: PESSIMISTIC LOCK (The Technical Flex)
    // We lock the specific washing machine row. Other concurrent requests
    // trying to book this machine will pause here until this transaction finishes.
    const [machine] = await tx
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .for("update"); // <-- THIS IS THE MAGIC WORD

    if (!machine || !machine.isOperational) {
      throw new Error("Resource is not available or under maintenance.");
    }

    // STEP 2: Check for Overlapping Bookings
    // Now that we hold the lock, we can safely check if the slot is taken.
    const overlapping = await tx
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.resourceId, resourceId),
          inArray(bookings.status, ["CONFIRMED", "ACTIVE"]),
          eq(bookings.startTime, startTime), // Checking exact slot match for simplicity
        ),
      );

    // STEP 3: Handle Taken Slot
    if (overlapping.length > 0) {
      // We throw a specific error code so the Controller knows to ask: "Join Waitlist?"
      const error = new Error("Slot is already taken.");
      error.name = "SLOT_TAKEN";
      throw error;
    }

    // STEP 4: Insert the Booking
    const [newBooking] = await tx
      .insert(bookings)
      .values({
        resourceId,
        userId,
        startTime,
        endTime,
        status: "CONFIRMED",
      })
      .returning();

    // The transaction ends here, and the lock on the machine is released for the next request.
    return newBooking;
  });
};

/**
 * 2. JOIN THE WAITLIST
 */
export const joinWaitlist = async (
  userId: string,
  hostelId: string,
  type: "LAUNDRY" | "BADMINTON",
) => {
  // Check if they are already on the waitlist to prevent spam
  const existing = await db.query.waitlists.findFirst({
    where: and(
      eq(waitlists.userId, userId),
      eq(waitlists.type, type),
      eq(waitlists.status, "WAITING"),
    ),
  });

  if (existing) throw new Error("You are already on the waitlist.");

  const [entry] = await db
    .insert(waitlists)
    .values({
      userId,
      hostelId,
      type,
      status: "WAITING",
    })
    .returning();

  return entry;
};

/**
 * 3. THE SMART ORCHESTRATOR: AUTO-ASSIGN ON CANCELLATION
 * This runs when a user cancels their slot, or misses their 10-minute claim window.
 */
// Inside src/modules/orchestrator/orchestrator.service.ts

export const cancelAndAutoAssign = async (bookingId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch the booking
    const [bookingToCancel] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (!bookingToCancel || bookingToCancel.status !== "CONFIRMED") {
      throw new Error("Invalid booking");
    }

    // 2. Mark as cancelled
    await tx
      .update(bookings)
      .set({ status: "CANCELLED" })
      .where(eq(bookings.id, bookingId));

    // 3. THE THRESHOLD CHECK
    const MINIMUM_USABLE_MINUTES = 25; // Minimum time needed to actually use the resource
    const now = new Date();

    // Calculate difference in minutes
    const remainingMinutes = Math.round(
      (bookingToCancel.endTime.getTime() - now.getTime()) / 60000,
    );

    // If there isn't enough time left, STOP HERE. Do not assign to waitlist.
    if (remainingMinutes < MINIMUM_USABLE_MINUTES) {
      console.log(
        `Only ${remainingMinutes} mins left. Slot is dead. Waitlist ignored.`,
      );
      return {
        message: "Booking cancelled. Remaining time too short to reassign.",
      };
    }

    // 4. Fetch the Resource and Waitlist (Only if we passed the threshold)
    const [resource] = await tx
      .select()
      .from(resources)
      .where(eq(resources.id, bookingToCancel.resourceId));

    const [nextInLine] = await tx
      .select()
      .from(waitlists)
      .where(
        and(
          eq(waitlists.hostelId, resource.hostelId),
          eq(waitlists.type, resource.type),
          eq(waitlists.status, "WAITING"),
        ),
      )
      .orderBy(asc(waitlists.joinedAt))
      .limit(1)
      .for("update");

    // 5. Assign to Waitlist
    if (nextInLine) {
      await tx
        .update(waitlists)
        .set({ status: "FULFILLED" })
        .where(eq(waitlists.id, nextInLine.id));

      await tx.insert(bookings).values({
        resourceId: bookingToCancel.resourceId,
        userId: nextInLine.userId,
        startTime: now, // Start right now
        endTime: bookingToCancel.endTime, // Keep the original hard boundary
        status: "CONFIRMED",
      });

      console.log(
        `Auto-assigned to User ${nextInLine.userId} for ${remainingMinutes} minutes.`,
      );
    }

    return { message: "Booking cancelled successfully. Waitlist processed." };
  });
};
