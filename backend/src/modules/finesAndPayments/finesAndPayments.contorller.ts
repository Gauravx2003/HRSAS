import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import { createPayment, waivePayment } from "./finesAndPayments.service";
import { payments, residentProfiles, rooms, users } from "../../db/schema";
import { eq, and, getTableColumns } from "drizzle-orm";
import { db } from "../../db";
import Razorpay from "razorpay";
import crypto from "crypto";

export const createPaymentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { residentId, amount, description, category } = req.body;

    if (!amount || !description || !category) {
      return res.status(400).json({ message: "Fields are required" });
    }

    const response = await createPayment(
      residentId,
      amount,
      category,
      description,
      req.user!.userId,
    );
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const waivePaymentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Payment ID is required" });
    }
    const response = await waivePayment(id);
    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPaymentsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { status } = req.query;

    let query = db
      .select({
        ...getTableColumns(payments),
        residentName: users.name,
        residentRoom: rooms.roomNumber,
      })
      .from(payments)
      .innerJoin(users, eq(payments.residentId, users.id))
      .innerJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .innerJoin(rooms, eq(residentProfiles.roomId, rooms.id));

    if (status) {
      query.where(
        eq(
          payments.status,
          status as "PENDING" | "COMPLETED" | "WAIVED" | "FAILED",
        ),
      );
    }

    const response = await query;
    return res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyPaymentsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { status } = req.query;

    let query = db
      .select({
        ...getTableColumns(payments),
        residentName: users.name,
        residentRoom: rooms.roomNumber,
      })
      .from(payments)
      .innerJoin(users, eq(payments.residentId, users.id))
      .innerJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .innerJoin(rooms, eq(residentProfiles.roomId, rooms.id));
    query.where(eq(payments.residentId, req.user!.userId));

    if (status) {
      query.where(
        and(
          eq(
            payments.status,
            status as "PENDING" | "COMPLETED" | "WAIVED" | "FAILED",
          ),
          eq(payments.residentId, req.user!.userId),
        ),
      );
    }

    const response = await query;
    return res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createRazorpayOrderController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { paymentId, amount } = req.body;

    //console.log(req.body);

    if (!paymentId || !amount) {
      return res
        .status(400)
        .json({ message: "Payment ID and amount are required" });
    }

    // Verify payment belongs to user
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment || payment.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment[0].residentId !== req.user!.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (payment[0].status !== "PENDING") {
      return res.status(400).json({ message: "Payment is not pending" });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: paymentId,
      notes: {
        paymentId,
        residentId: req.user!.userId,
      },
    };

    const order = await razorpay.orders.create(options);

    //console.log(order);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

export const verifyPaymentController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
      req.body;

    if (
      !paymentId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return res
        .status(400)
        .json({ message: "All payment details are required" });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "COMPLETED",
        razorpayPaymentId,
        razorpayOrderId,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    res.status(200).json({ message: "Payment verified successfully" });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
