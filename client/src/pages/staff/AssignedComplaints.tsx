import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";

interface Complaint {
  id: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  residentId: string;
  category: string;
}

const AssignedComplaints = () => {
  const [assigned, setAssigned] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = () => {
    setIsLoading(true);
    api
      .get("/staff/complaints")
      .then((res) => {
        setAssigned(res.data);
      })
      .catch((error) => {
        console.error("Error fetching complaints:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const updateStatus = (id: string, status: string) => {
    if (!status) return;

    setUpdatingId(id);
    api
      .patch(`/staff/complaints/${id}/status`, { status })
      .then(() => {
        fetchComplaints();
      })
      .catch((error) => {
        console.error("Error updating status:", error);
      })
      .finally(() => {
        setUpdatingId(null);
      });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
        return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "ASSIGNED":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "REJECTED":
        return <AlertCircle className="w-3 h-3 mr-1" />;
      case "IN_PROGRESS":
        return <RefreshCw className="w-3 h-3 mr-1" />;
      default:
        return <Clock className="w-3 h-3 mr-1" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "HIGH":
        return "bg-red-100 text-red-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";
      case "LOW":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Assigned Complaints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and update status of complaints assigned to you
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : assigned.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No complaints assigned to you</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {assigned.map((complaint) => (
            <div
              key={complaint.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      complaint.status,
                    )}`}
                  >
                    {getStatusIcon(complaint.status)}
                    {complaint.status}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                      complaint.priority,
                    )}`}
                  >
                    {complaint.priority}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="mb-3">
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                  {complaint.category}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                {complaint.description}
              </p>

              {complaint.status !== "RESOLVED" &&
                complaint.status !== "ESCALATED" && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-700">
                      Update Status:
                    </label>
                    <select
                      value=""
                      onChange={(e) =>
                        updateStatus(complaint.id, e.target.value)
                      }
                      disabled={updatingId === complaint.id}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {updatingId === complaint.id
                          ? "Updating..."
                          : "Select new status"}
                      </option>
                      {complaint.status !== "IN_PROGRESS" && (
                        <option value="IN_PROGRESS">In Progress</option>
                      )}
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                )}

              {complaint.status === "RESOLVED" && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Complaint Resolved</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedComplaints;
