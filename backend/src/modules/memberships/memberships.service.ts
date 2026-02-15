import { db } from "../../db";
import {
  gymPlans,
  libraryPlans,
  gymMemberships,
  libraryMemberships,
  payments,
  users,
} from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createPayment } from "../finesAndPayments/finesAndPayments.service";

// --- Plans ---

export const getLibraryPlans = async (hostelId: string) => {
  return await db
    .select()
    .from(libraryPlans)
    .where(
      and(eq(libraryPlans.hostelId, hostelId), eq(libraryPlans.isActive, true)),
    );
};

export const getGymPlans = async (hostelId: string) => {
  return await db
    .select()
    .from(gymPlans)
    .where(and(eq(gymPlans.hostelId, hostelId), eq(gymPlans.isActive, true)));
};

// --- Subscription ---

export const subscribeToLibraryPlan = async (
  userId: string,
  planId: string,
) => {
  return await db.transaction(async (tx) => {
    // 1. Get Plan Details
    const [plan] = await tx
      .select()
      .from(libraryPlans)
      .where(eq(libraryPlans.id, planId));

    if (!plan) throw new Error("Invalid Library Plan");

    // 2. Create Payment Record (Pending)
    // We reuse the existing createPayment logic, but we might need to call it inside this transaction
    // ideally or refactor createPayment to accept a tx.
    // For now, we'll import createPayment but note that createPayment uses its own transaction.
    // To align properly, we should probably just insert here directly for atomicity or refactor createPayment.
    // Let's insert directly here to ensure the Payment + Membership are linked and atomic.

    // Fetch user for creating payment (needed for 'issuedBy' if self-service, usually system or self)
    // In this flow, user is subscribing themselves.

    const [payment] = await tx
      .insert(payments)
      .values({
        residentId: userId,
        amount: plan.price,
        category: "LIBRARY_MEMBERSHIP",
        description: `Subscription to ${plan.name}`,
        status: "PENDING",
        issuedBy: userId, // Self-initiated
      })
      .returning();

    // 3. Calculate End Date
    const startDate = new Date();
    const endDate = new Date(startDate);

    switch (plan.duration) {
      case "MONTHLY":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "QUARTERLY":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "HALF_YEARLY":
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case "YEARLY":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    // 4. Create Membership Record (Pending Payment)
    const [membership] = await tx
      .insert(libraryMemberships)
      .values({
        userId,
        planId,
        startDate,
        endDate,
        status: "PENDING_PAYMENT",
        paymentId: payment.id,
      })
      .returning();

    return { payment, membership };
  });
};

export const subscribeToGymPlan = async (userId: string, planId: string) => {
  return await db.transaction(async (tx) => {
    const [plan] = await tx
      .select()
      .from(gymPlans)
      .where(eq(gymPlans.id, planId));

    if (!plan) throw new Error("Invalid Gym Plan");

    const [payment] = await tx
      .insert(payments)
      .values({
        residentId: userId,
        amount: plan.price,
        category: "GYM_MEMBERSHIP",
        description: `Subscription to ${plan.name}`,
        status: "PENDING",
        issuedBy: userId,
      })
      .returning();

    const startDate = new Date();
    const endDate = new Date(startDate);

    switch (plan.duration) {
      case "MONTHLY":
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case "QUARTERLY":
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case "HALF_YEARLY":
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case "YEARLY":
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    const [membership] = await tx
      .insert(gymMemberships)
      .values({
        userId,
        planId,
        startDate,
        endDate,
        status: "PENDING_PAYMENT",
        paymentId: payment.id,
      })
      .returning();

    return { payment, membership };
  });
};

// --- Activation (Called after Payment verification) ---

export const activateMembership = async (paymentId: string) => {
  // Check if this payment is linked to a Library Membership
  const [libMem] = await db
    .select()
    .from(libraryMemberships)
    .where(eq(libraryMemberships.paymentId, paymentId));

  if (libMem) {
    await db
      .update(libraryMemberships)
      .set({ status: "ACTIVE" })
      .where(eq(libraryMemberships.id, libMem.id));
    return { type: "LIBRARY", membership: libMem };
  }

  // Check if Gym
  const [gymMem] = await db
    .select()
    .from(gymMemberships)
    .where(eq(gymMemberships.paymentId, paymentId));

  if (gymMem) {
    await db
      .update(gymMemberships)
      .set({ status: "ACTIVE" })
      .where(eq(gymMemberships.id, gymMem.id));
    return { type: "GYM", membership: gymMem };
  }

  return null; // Not a membership payment
};

export const getMyMemberships = async (userId: string) => {
  const library = await db
    .select({
      id: libraryMemberships.id,
      status: libraryMemberships.status,
      startDate: libraryMemberships.startDate,
      endDate: libraryMemberships.endDate,
      planName: libraryPlans.name,
    })
    .from(libraryMemberships)
    .innerJoin(libraryPlans, eq(libraryMemberships.planId, libraryPlans.id))
    .where(eq(libraryMemberships.userId, userId));

  const gym = await db
    .select({
      id: gymMemberships.id,
      status: gymMemberships.status,
      startDate: gymMemberships.startDate,
      endDate: gymMemberships.endDate,
      planName: gymPlans.name,
    })
    .from(gymMemberships)
    .innerJoin(gymPlans, eq(gymMemberships.planId, gymPlans.id))
    .where(eq(gymMemberships.userId, userId));

  return { library, gym };
};
