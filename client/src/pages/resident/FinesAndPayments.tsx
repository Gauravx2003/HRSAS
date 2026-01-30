import { useState, useEffect } from "react";
import api from "../../services/api";
import { DollarSign } from "lucide-react";
import PaymentCard from "../../components/PaymentCard";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/slices/authSlice";

interface Payment {
  id: string;
  amount: number;
  status: string;
  description: string;
  category: string;
  createdAt: string;
}

const FinesAndPayments = () => {
  const user = useSelector(selectCurrentUser);
  const [filter, setFilter] = useState<
    "ALL" | "WAIVED" | "PENDING" | "COMPLETED"
  >("ALL");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      let url = "/payments/my-payments";

      if (filter !== "ALL") {
        url += `?status=${filter}`;
      }

      const res = await api.get(url);
      setPayments(res.data);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Fines & Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage your fines and payment history
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "PENDING"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("COMPLETED")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "COMPLETED"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter("WAIVED")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "WAIVED"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Waived
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No payments found</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {payments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onPaymentSuccess={fetchPayments}
              userDetails={{
                name: user?.name || "",
                email: user?.email || "",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FinesAndPayments;
