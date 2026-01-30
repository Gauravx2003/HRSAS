import { Router } from "express";
import {
  createPaymentController,
  getMyPaymentsController,
  getPaymentsController,
  waivePaymentController,
  createRazorpayOrderController,
  verifyPaymentController,
} from "./finesAndPayments.contorller";
import { authenticate, authorize } from "../../middleware/auth";

const router = Router();

router.post(
  "/create",
  authenticate,
  authorize(["ADMIN"]),
  createPaymentController,
);

router.patch(
  "/:id/waive",
  authenticate,
  authorize(["ADMIN"]),
  waivePaymentController,
);

router.get("/", authenticate, authorize(["ADMIN"]), getPaymentsController);

router.get(
  "/my-payments",
  authenticate,
  authorize(["RESIDENT"]),
  getMyPaymentsController,
);

// Razorpay routes
router.post(
  "/create-order",
  authenticate,
  authorize(["RESIDENT"]),
  createRazorpayOrderController,
);

router.post(
  "/verify",
  authenticate,
  authorize(["RESIDENT"]),
  verifyPaymentController,
);

export default router;
