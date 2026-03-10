import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Search,
  ChevronDown,
  MoreVertical,
  Phone,
} from "lucide-react";

interface VisitorRequest {
  id: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  relation: string;
  visitDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
  createdAt: string;
  residentName: string;
  roomNumber: string;
  block: string;
}

const VisitorsApproval = () => {
  const [requests, setRequests] = useState<VisitorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      let endpoint = "/visitors/all";

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
      await api.patch(`/visitors/${id}/update`, { status: "APPROVED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/visitors/${id}/update`, { status: "REJECTED" });
      fetchRequests();
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const vName = r.visitorName || "";
      const rName = r.residentName || "";
      const rRoom = r.roomNumber || "";
      
      const matchesSearch =
        vName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rRoom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [requests, searchQuery]);

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
      case "CLOSED":
        return {
          label: "Closed",
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          classes: "bg-slate-100 text-slate-700",
        };
      default:
        return {
          label: status,
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          classes: "bg-slate-100 text-slate-700",
        };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
              Visitor Approvals
            </h1>
            <p className="text-slate-500 mt-1">
              Review and manage visitor requests from residents
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
                placeholder="Search by visitor, resident or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
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
                  <option value="CLOSED">Closed</option>
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
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p>No requests found matching your criteria</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Visitor Name & Phone
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Resident & Room
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Relation
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-4 uppercase text-xs tracking-wider">
                      Visit Date
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
                    const initials = getInitials(request.visitorName);

                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">
                                {request.visitorName || "Unknown"}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{request.visitorPhone}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">
                                {request.residentName}
                              </span>
                              <span className="text-xs text-slate-500">
                                Block {request.block} - Room {request.roomNumber}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {request.relation}
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-37.5 truncate">
                          {request.purpose}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(request.visitDate)}
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

export default VisitorsApproval;
