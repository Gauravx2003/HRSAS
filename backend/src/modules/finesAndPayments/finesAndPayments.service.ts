import { db } from "../../db";
import { users, payments, type paymentCategoryEnum } from "../../db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "../notifications/notifications.service";

export const createPayment = async (
  residentId: string,
  amount: number,
  category: "HOSTEL_FEE" | "FINE" | "MESS_FEE" | "SECURITY_DEPOSIT",
  description: string,
  issuedBy: string,
) => {
  const [resident] = await db
    .select()
    .from(users)
    .where(eq(users.id, residentId));

  if (resident.role !== "RESIDENT") {
    throw new Error("Fine is applicable on residents only");
  }

  return await db.transaction(async (tx) => {
    const [record] = await tx
      .insert(payments)
      .values({
        residentId,
        issuedBy,
        amount,
        category,
        description,
        status: "PENDING",
      })
      .returning();

    const message =
      category === "FINE"
        ? `You have been fined ₹${amount} for: ${description}`
        : `New Payment Due: ₹${amount} for ${category}`;

    await createNotification(tx, residentId, message);

    return record;
  });
};

export const waivePayment = async (paymentId: string) => {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (payment.status !== "PENDING") {
    throw new Error("Payment is already paid");
  }

  return await db.transaction(async (tx) => {
    const [record] = await tx
      .update(payments)
      .set({ status: "WAIVED" })
      .where(eq(payments.id, paymentId))
      .returning();

    await createNotification(
      tx,
      payment.residentId,
      "Your fine has been waived",
    );

    return record;
  });
};
