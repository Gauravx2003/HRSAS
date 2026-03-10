import { useEffect, useState, useMemo } from "react";
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
  Search,
  ChevronDown,
  MoreVertical,
} from "lucide-react";

interface LateEntryRequest {
  id: string;
  type: "ENTRY" | "EXIT" | "OVERNIGHT";
  reason: string;
  outTime: string;
  inTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  residentName: string;
  residentRoomNumber: string;
}

const LateEntryExitApproval = () => {
  const [requests, setRequests] = useState<LateEntryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [passTypeFilter, setPassTypeFilter] = useState("ALL");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      let endpoint = "/gate-pass/all";

      if (statusFilter !== "ALL") {
        endpoint += `?status=${statusFilter}`;
      }

      const response = await api.get(endpoint);
      setRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/gate-pass/${id}`, { status: "APPROVED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/gate-pass/${id}`, { status: "REJECTED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const name = r.residentName || "";
      const room = r.residentRoomNumber || "";

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPassType =
        passTypeFilter === "ALL" ? true : r.type === passTypeFilter;

      return matchesSearch && matchesPassType;
    });
  }, [requests, searchQuery, passTypeFilter]);

  const getPassTypeInfo = (type: string) => {
    switch (type) {
      case "ENTRY":
        return {
          label: "Entry",
          icon: <LogIn className="w-4 h-4" />,
          classes: "bg-blue-50 text-blue-700",
        };
      case "EXIT":
        return {
          label: "Exit",
          icon: <LogOut className="w-4 h-4" />,
          classes: "bg-purple-50 text-purple-700",
        };
      case "OVERNIGHT":
        return {
          label: "Overnight",
          icon: <Moon className="w-4 h-4" />,
          classes: "bg-indigo-50 text-indigo-700",
        };
      default:
        return {
          label: type,
          icon: <FileText className="w-4 h-4" />,
          classes: "bg-slate-50 text-slate-700",
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          label: "Approved",
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          classes: "bg-green-100 text-green-700",
        };
      case "REJECTED":
        return {
          label: "Rejected",
          icon: <XCircle className="w-3.5 h-3.5" />,
          classes: "bg-red-100 text-red-700",
        };
      case "PENDING":
        return {
          label: "Pending",
          icon: <Clock className="w-3.5 h-3.5" />,
          classes: "bg-yellow-100 text-yellow-700",
        };
      default:
        return {
          label: status,
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          classes: "bg-slate-100 text-slate-700",
        };
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart}, ${timePart}`;
  };

  const getTimeDisplay = (request: LateEntryRequest) => {
    if (request.type === "ENTRY") {
      return formatDateTime(request.inTime);
    } else if (request.type === "EXIT") {
      return formatDateTime(request.outTime);
    } else {
      return (
        <div className="flex flex-col text-xs">
          <span className="text-slate-500">
            Out: {formatDateTime(request.outTime)}
          </span>
          <span className="text-slate-700 font-medium">
            In: {formatDateTime(request.inTime)}
          </span>
        </div>
      );
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
              Late Entry / Exit Approvals
            </h1>
            <p className="text-slate-500 mt-1">
              Review and manage gate pass requests
            </p>
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
                placeholder="Search by resident name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-40">
                <select
                  className="w-full appearance-none px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50 transition-colors bg-white font-medium text-slate-700 cursor-pointer"
                  value={passTypeFilter}
                  onChange={(e) => setPassTypeFilter(e.target.value)}
                >
                  <option value="ALL">All Passes</option>
                  <option value="ENTRY">Entry</option>
                  <option value="EXIT">Exit</option>
                  <option value="OVERNIGHT">Overnight</option>
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
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
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
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-64">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <p>No requests found matching your criteria</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Resident Name
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Block & Room
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Pass
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Reason
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
                  {filteredRequests.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    const initials = getInitials(request.residentName);
                    const passType = getPassTypeInfo(request.type);

                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <span className="font-semibold text-slate-900">
                              {request.residentName || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          Room {request.residentRoomNumber}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${passType.classes}`}
                          >
                            {passType.icon}
                            {passType.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {getTimeDisplay(request)}
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-50 truncate">
                          {request.reason || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.classes}`}
                          >
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {request.status === "PENDING" ? (
                              <>
                                <button
                                  onClick={() => handleApprove(request.id)}
                                  className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors px-3 py-1.5 rounded-md flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(request.id)}
                                  className="text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-md flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination (Static UI for consistent look) */}
          {!isLoading && filteredRequests.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm">
              <div className="text-slate-500">
                Showing {filteredRequests.length} entries
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LateEntryExitApproval;
