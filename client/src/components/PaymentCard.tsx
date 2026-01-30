import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
} from "lucide-react";
import {
  createRazorpayOrder,
  verifyPayment,
} from "../services/payment.service";
import type { RazorpayOptions, RazorpayResponse } from "../types/razorpay";

interface Payment {
  id: string;
  amount: number;
  status: string;
  description: string;
  category: string;
  createdAt: string;
}

// Reusable PaymentCard component - can be extracted to components/common/ later for admin use
interface PaymentCardProps {
  payment: Payment;
  onPaymentSuccess?: () => void;
  userDetails?: {
    name: string;
    email: string;
    contact?: string;
  };
}

const PaymentCard = ({
  payment,
  onPaymentSuccess,
  userDetails,
}: PaymentCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "WAIVED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "WAIVED":
        return <AlertCircle className="w-3 h-3 mr-1" />;
      case "PENDING":
        return <Clock className="w-3 h-3 mr-1" />;
      default:
        return <DollarSign className="w-3 h-3 mr-1" />;
    }
  };

  const handlePayment = async () => {
    if (!window.Razorpay) {
      alert(
        "Payment gateway not loaded. Please refresh the page and try again.",
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order
      const orderData = await createRazorpayOrder(payment.id, payment.amount);

      const options: RazorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy_key",
        amount: orderData.amount, // Amount in paise
        currency: orderData.currency,
        name: "Hostel Management System",
        description: payment.description,
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment on backend
            await verifyPayment(
              payment.id,
              response.razorpay_payment_id,
              response.razorpay_order_id || "",
              response.razorpay_signature || "",
            );

            alert("Payment successful!");
            onPaymentSuccess?.();
          } catch (error) {
            console.error("Payment verification failed:", error);
            alert("Payment verification failed. Please contact support.");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: userDetails?.name || "",
          email: userDetails?.email || "",
          contact: userDetails?.contact || "",
        },
        theme: {
          color: "#4F46E5", // Indigo color matching the app theme
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Failed to initiate payment:", error);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow">
      {/* Header: Status & Amount */}
      <div className="flex justify-between items-start mb-3">
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}
        >
          {getStatusIcon(payment.status)}
          {payment.status.replace("_", " ")}
        </span>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">
            ₹{payment.amount.toFixed(2)}
          </div>
          <span className="text-xs text-slate-500">
            {new Date(payment.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Category Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
          <DollarSign className="w-3 h-3" />
          {payment.category}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
        {payment.description}
      </p>

      {/* Action Button - Only show for PENDING payments */}
      {payment.status.toUpperCase() === "PENDING" && (
        <div className="pt-3 border-t border-slate-100">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Message for non-pending payments */}
      {payment.status.toUpperCase() === "COMPLETED" && (
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Payment Completed
          </div>
        </div>
      )}

      {payment.status.toUpperCase() === "WAIVED" && (
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-center gap-1 text-sm text-blue-600">
            <AlertCircle className="w-4 h-4" />
            Fine Waived
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCard;
