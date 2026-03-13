import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import {
  FileText,
  Search,
  ChevronDown,
  Download,
  Plus,
  MoreVertical,
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
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("ALL");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/payments");
      setAllPayments(res.data);
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

  // derived stats
  const totalCollected = useMemo(() => {
    return allPayments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const pendingAmount = useMemo(() => {
    return allPayments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const pendingCount = useMemo(() => {
    return allPayments.filter((p) => p.status === "PENDING").length;
  }, [allPayments]);

  const recentPaymentsCount = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return allPayments.filter(
      (p) => p.status === "COMPLETED" && new Date(p.createdAt) >= sevenDaysAgo,
    ).length;
  }, [allPayments]);

  // filtering
  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      const name = p.residentName || "";
      const room = p.residentRoom || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ? true : p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allPayments, searchQuery, statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return { label: "Paid", classes: "bg-green-100 text-green-700" };
      case "PENDING":
        return { label: "Pending", classes: "bg-orange-100 text-orange-700" };
      case "WAIVED":
        return { label: "Waived", classes: "bg-slate-100 text-slate-700" };
      case "OVERDUE":
        return { label: "Overdue", classes: "bg-red-100 text-red-700" };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
          classes: "bg-slate-100 text-slate-700",
        };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Fines & Payments
            </h1>
            <p className="text-slate-500 mt-1">
              Manage resident penalties and financial tracking across all blocks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Fine
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Fines Collected */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <span className="text-slate-500 font-medium">
                Total Fines Collected
              </span>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-bold text-slate-900">
                ₹
                {totalCollected.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-sm font-medium text-green-600">
                +12% vs last month
              </span>
            </div>
          </div>

          {/* Pending Fines */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <span className="text-slate-500 font-medium">Pending Fines</span>
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-bold text-slate-900">
                ₹
                {pendingAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-sm font-medium text-orange-600">
                {pendingCount} residents pending
              </span>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <span className="text-slate-500 font-medium">
                Recent Payments
              </span>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-bold text-slate-900">
                {recentPaymentsCount}
              </span>
              <span className="text-sm font-medium text-blue-600">
                Past 7 days
              </span>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:bg-slate-50 focus:bg-white"
                placeholder="Search by resident name, room, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-36">
                <select
                  className="w-full appearance-none px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50 transition-colors bg-white font-medium text-slate-700 cursor-pointer"
                  value={blockFilter}
                  onChange={(e) => setBlockFilter(e.target.value)}
                >
                  <option value="ALL">All Blocks</option>
                  <option value="A">Block A</option>
                  <option value="B">Block B</option>
                  <option value="C">Block C</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              <div className="relative w-full md:w-40">
                <select
                  className="w-full appearance-none px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50 transition-colors bg-white font-medium text-slate-700 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="WAIVED">Waived</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-75">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600"></div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-64">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <p>No payments found matching your criteria</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Resident Name
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Block / Room
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => {
                    const statusDisplay = getStatusDisplay(payment.status);
                    const initials = getInitials(payment.residentName);

                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <span className="font-semibold text-slate-900">
                              {payment.residentName || "Unknown Resident"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          Block A / {payment.residentRoom}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {payment.description ||
                            payment.category.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          ₹{payment.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.classes}`}
                          >
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            {payment.status === "PENDING" && (
                              <button
                                onClick={() => handleWaive(payment.id)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                              >
                                Waive
                              </button>
                            )}
                            <button className="hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && filteredPayments.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm">
              <div className="text-slate-500">
                Showing 1 to {Math.min(filteredPayments.length, 10)} of{" "}
                {filteredPayments.length} entries
              </div>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-500 hover:bg-slate-50 bg-white font-medium hover:text-slate-900 transition-colors disabled:opacity-50">
                  Previous
                </button>
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-medium">
                  1
                </button>
                <button className="px-3 py-1.5 border border-transparent text-slate-600 hover:bg-slate-50 rounded-md font-medium transition-colors">
                  2
                </button>
                <button className="px-3 py-1.5 border border-transparent text-slate-600 hover:bg-slate-50 rounded-md font-medium transition-colors">
                  3
                </button>
                <button className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 bg-white font-medium hover:text-slate-900 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Impose a New Fine section at the bottom */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 bg-blue-50/30 rounded-2xl border border-blue-100 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Impose a New Fine
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Quickly add a penalty for a resident violation. An email
              notification will be sent automatically.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Resident
                  </label>
                  <div className="relative">
                    <select className="w-full appearance-none px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 cursor-pointer shadow-sm">
                      <option value="">Select Resident...</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Amount ($)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25.00"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  placeholder="Describe the violation..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm mt-2"
              >
                Impose & Notify Resident
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900">Policy Guideline</h3>
            </div>

            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                <span>Late entry fine: $10/hr after 10 PM.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                <span>Property damage: Full cost + $50 fee.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                <span>Cleanliness: $15 per inspection fail.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                <span>Unauthorized pets: $100 initial fine.</span>
              </li>
            </ul>
          </div>
        </div> */}
      </div>

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
