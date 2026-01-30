import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Home,
  Calendar,
  Tag,
  Plus,
} from "lucide-react";
import CreateFineModal from "../../components/CreateFineModal";

interface Payment {
  id: string;
  amount: number;
  status: string;
  description: string;
  category: string;
  createdAt: string;
  residentId: string;
  residentName: string;
  residentRoom: string;
}

const FineManage = () => {
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "COMPLETED" | "WAIVED"
  >("PENDING");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      let url = "/payments";

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

  const handleWaive = async (id: string) => {
    try {
      await api.patch(`/payments/${id}/waive`);
      fetchPayments();
    } catch (error) {
      console.error("Failed to waive payment:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return {
          label: "Completed",
          icon: <CheckCircle className="w-3 h-3" />,
          color: "bg-green-100 text-green-700",
        };
      case "WAIVED":
        return {
          label: "Waived",
          icon: <AlertCircle className="w-3 h-3" />,
          color: "bg-blue-100 text-blue-700",
        };
      case "PENDING":
        return {
          label: "Pending",
          icon: <XCircle className="w-3 h-3" />,
          color: "bg-yellow-100 text-yellow-700",
        };
      default:
        return {
          label: status,
          icon: <AlertCircle className="w-3 h-3" />,
          color: "bg-slate-100 text-slate-700",
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Fines & Payments Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and manage resident fines and payments
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Impose Fine
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
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
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Payments
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No payments found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => {
            const status = getStatusBadge(payment.status);

            return (
              <div
                key={payment.id}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Resident Info */}
                  <div
                    className="flex items-center gap-3 min-w-0 flex-shrink-0"
                    style={{ width: "200px" }}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">
                        {payment.residentName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Home className="w-3 h-3" />
                        <span>Room {payment.residentRoom}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Payment Details */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Amount */}
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-slate-800">
                        ₹{payment.amount.toFixed(2)}
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 flex-shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        {payment.category}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(payment.createdAt)}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {payment.status === "PENDING" ? (
                      <button
                        onClick={() => handleWaive(payment.id)}
                        className="flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Waive Fine
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description - Below */}
                {payment.description && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Description:</span>
                    <span className="text-sm text-slate-700 flex-1">
                      {payment.description}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Fine Modal */}
      {isModalOpen && (
        <CreateFineModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchPayments}
        />
      )}
    </div>
  );
};

export default FineManage;
