import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  User,
  Phone,
  Calendar,
  Key,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
} from "lucide-react";

interface Visitor {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitDate: string;
  entryCode: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const VisitorRequest = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");


  useEffect(() => {
    fetchVisitors();
  }, [activeFilter]);

  const fetchVisitors = async () => {
    setIsLoading(true);
    try {
      let url = "/visitors/my-requests";
      if (activeFilter !== "ALL") {
        url += `?status=${activeFilter}`;
      }
      const response = await api.get(url);
      setVisitors(response.data);
    } catch (error) {
      console.error("Failed to fetch visitors:", error);
    } finally {
      setIsLoading(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const filterTabs: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Visitor Requests
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View and track your visitor pass requests
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === tab.value
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No visitor requests found</p>
          <p className="text-sm text-slate-500 mt-1">
            {activeFilter === "ALL"
              ? "You haven't made any visitor requests yet."
              : `No ${activeFilter.toLowerCase()} visitor requests.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {visitors.map((visitor) => {
            const status = getStatusBadge(visitor.status);
            const visitDateTime = formatDateTime(visitor.visitDate);

            return (
              <div
                key={visitor.id}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                {/* Header: Visitor Name & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {visitor.visitorName}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Phone className="w-3 h-3" />
                        <span>{visitor.visitorPhone}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color}`}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                </div>

                {/* Visit Date */}
                <div className="flex items-start gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Visit Date</p>
                    <p className="text-sm font-medium text-slate-700">
                      {visitDateTime.date} • {visitDateTime.time}
                    </p>
                  </div>
                </div>

                {/* Entry Code - Only show if approved */}
                {visitor.status === "APPROVED" && visitor.entryCode && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-green-700 font-medium">
                        Entry Code
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-800 mt-1 tracking-wider">
                      {visitor.entryCode}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Share this code with your visitor
                    </p>
                  </div>
                )}

                {/* Pending message */}
                {visitor.status === "PENDING" && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      Your request is being reviewed. Entry code will be
                      generated upon approval.
                    </p>
                  </div>
                )}

                {/* Rejected message */}
                {visitor.status === "REJECTED" && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700">
                      This visitor request was rejected.
                    </p>
                  </div>
                )}

                {/* Footer: Request Date */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    Requested on {formatDate(visitor.createdAt)}
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

export default VisitorRequest;
