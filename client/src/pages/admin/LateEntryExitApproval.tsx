import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Moon,
  User,
  Home,
  ArrowRight,
} from "lucide-react";

interface LateEntryRequest {
  id: string;
  type: "ENTRY" | "EXIT" | "OVERNIGHT";
  reason: string;
  fromTime: string;
  toTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  residentName: string;
  residentRoomNumber: string;
}

const LateEntryExitApproval = () => {
  const [requests, setRequests] = useState<LateEntryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED">(
    "PENDING",
  );

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      let endpoint = "/late-entry-exit/pending";

      if (filter === "ALL") {
        endpoint = "/late-entry-exit/all";
      } else if (filter === "PENDING") {
        endpoint = "/late-entry-exit/pending";
      } else if (filter === "APPROVED") {
        endpoint = "/late-entry-exit/approved";
      }

      const response = await api.get(endpoint);

      // Filter on frontend if needed
      let filteredData = response.data;
      if (filter === "APPROVED") {
        filteredData = response.data.filter(
          (req: LateEntryRequest) => req.status === "APPROVED",
        );
      }

      setRequests(filteredData);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/late-entry-exit/${id}`, { status: "APPROVED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/late-entry-exit/${id}`, { status: "REJECTED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };

  const getPassTypeInfo = (type: string) => {
    switch (type) {
      case "ENTRY":
        return {
          label: "Entry Pass",
          icon: <LogIn className="w-4 h-4" />,
          color: "bg-blue-50 text-blue-700",
        };
      case "EXIT":
        return {
          label: "Exit Pass",
          icon: <LogOut className="w-4 h-4" />,
          color: "bg-purple-50 text-purple-700",
        };
      case "OVERNIGHT":
        return {
          label: "Overnight Pass",
          icon: <Moon className="w-4 h-4" />,
          color: "bg-indigo-50 text-indigo-700",
        };
      default:
        return {
          label: type,
          icon: <FileText className="w-4 h-4" />,
          color: "bg-slate-50 text-slate-700",
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          label: "Approved",
          icon: <CheckCircle className="w-3 h-3" />,
          color: "bg-green-100 text-green-700",
        };
      case "REJECTED":
        return {
          label: "Rejected",
          icon: <XCircle className="w-3 h-3" />,
          color: "bg-red-100 text-red-700",
        };
      case "PENDING":
        return {
          label: "Pending",
          icon: <Clock className="w-3 h-3" />,
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Late Entry / Exit Approvals
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and manage gate pass requests
        </p>
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
          onClick={() => setFilter("APPROVED")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "APPROVED"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Requests
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No requests found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => {
            const passType = getPassTypeInfo(request.type);
            const status = getStatusBadge(request.status);
            const fromDateTime = formatDateTime(request.fromTime);
            const toDateTime = formatDateTime(request.toTime);

            return (
              <div
                key={request.id}
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
                        {request.residentName}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Home className="w-3 h-3" />
                        <span>Room {request.residentRoomNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Time Range & Pass Type */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Time Range */}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="text-slate-700">
                        <div className="font-medium">
                          {fromDateTime.date}, {fromDateTime.time}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <div className="text-slate-700">
                        <div className="font-medium">
                          {toDateTime.date}, {toDateTime.time}
                        </div>
                      </div>
                    </div>

                    {/* Pass Type Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${passType.color} flex-shrink-0`}
                    >
                      {passType.icon}
                      <span className="text-xs font-medium italic">
                        "{passType.label}"
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {request.status === "PENDING" ? (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
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

                {/* Reason - Below if needed */}
                {request.reason && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Reason:</span>
                    <span className="text-sm text-slate-700 flex-1">
                      {request.reason}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LateEntryExitApproval;
