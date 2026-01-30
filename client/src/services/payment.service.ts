import api from "./api";

export const createRazorpayOrder = async (
  paymentId: string,
  amount: number,
) => {
  const response = await api.post("/payments/create-order", {
    paymentId,
    amount,
  });
  return response.data;
};

export const verifyPayment = async (
  paymentId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string,
) => {
  const response = await api.post("/payments/verify", {
    paymentId,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
  });
  return response.data;
};
