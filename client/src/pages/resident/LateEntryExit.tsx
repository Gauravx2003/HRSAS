import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Clock,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Moon,
} from "lucide-react";

interface LateEntryRequest {
  id: string;
  type: "ENTRY" | "EXIT" | "OVERNIGHT";
  reason: string;
  fromTime: string;
  toTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const LateEntryExit = () => {
  const [requests, setRequests] = useState<LateEntryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/late-entry-exit/my");
      setRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPassTypeInfo = (type: string) => {
    switch (type) {
      case "ENTRY":
        return {
          label: "Entry Pass",
          icon: <LogIn className="w-5 h-5" />,
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "EXIT":
        return {
          label: "Exit Pass",
          icon: <LogOut className="w-5 h-5" />,
          color: "bg-purple-100 text-purple-700 border-purple-200",
        };
      case "OVERNIGHT":
        return {
          label: "Overnight Pass",
          icon: <Moon className="w-5 h-5" />,
          color: "bg-indigo-100 text-indigo-700 border-indigo-200",
        };
      default:
        return {
          label: type,
          icon: <FileText className="w-5 h-5" />,
          color: "bg-slate-100 text-slate-700 border-slate-200",
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
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Late Entry / Exit Requests
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View and track your gate pass requests
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No requests yet</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {requests.map((request) => {
            const passType = getPassTypeInfo(request.type);
            const status = getStatusBadge(request.status);
            const fromDateTime = formatDateTime(request.fromTime);
            const toDateTime = formatDateTime(request.toTime);
            const createdDateTime = formatDateTime(request.createdAt);

            return (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                {/* Header: Pass Type & Status */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${passType.color}`}
                  >
                    {passType.icon}
                    <span className="font-semibold text-sm">
                      {passType.label}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color}`}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                </div>

                {/* Time Details */}
                <div className="space-y-3 mb-4">
                  {/* From Time */}
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">From</p>
                      <p className="text-sm font-medium text-slate-700">
                        {fromDateTime.date} • {fromDateTime.time}
                      </p>
                    </div>
                  </div>

                  {/* To Time */}
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">To</p>
                      <p className="text-sm font-medium text-slate-700">
                        {toDateTime.date} • {toDateTime.time}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Reason</p>
                  <p className="text-sm text-slate-700 line-clamp-2">
                    {request.reason}
                  </p>
                </div>

                {/* Footer: Created At */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Requested on {createdDateTime.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LateEntryExit;
