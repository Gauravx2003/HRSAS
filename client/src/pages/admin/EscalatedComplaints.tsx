import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  getStaffBySpecialization,
  reassignComplaint,
  type Staff,
} from "../../services/complaint.service";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  X,
} from "lucide-react";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  categoryName: string;
  residentName: string;
  roomNumber: string;
  assignedStaffName?: string;
  createdAt: string;
  priority: string;
}

const EscalatedComplaints = () => {
  const [escalatedComplaints, setEscalatedComplaints] = useState<Complaint[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  useEffect(() => {
    fetchEscalatedComplaints();
  }, []);

  const fetchEscalatedComplaints = () => {
    setIsLoading(true);
    api
      .get("/complaints/escalated")
      .then((res) => {
        setEscalatedComplaints(res.data);
      })
      .catch((error) => {
        console.error("Error fetching escalated complaints:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleReassignClick = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setSelectedStaffId("");
    setIsLoadingStaff(true);

    try {
      const staff = await getStaffBySpecialization(complaint.categoryName);
      setAvailableStaff(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setAvailableStaff([]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleReassignConfirm = async () => {
    if (!selectedComplaint || !selectedStaffId) return;

    setIsReassigning(true);
    try {
      await reassignComplaint(selectedComplaint.id, selectedStaffId);
      setSelectedComplaint(null);
      setSelectedStaffId("");
      fetchEscalatedComplaints();
    } catch (error) {
      console.error("Error reassigning complaint:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
        return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "ESCALATED":
        return "bg-orange-100 text-orange-700 border-orange-200";
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
      case "ESCALATED":
        return <AlertCircle className="w-3 h-3 mr-1" />;
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
            Escalated Complaints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reassign escalated complaints to appropriate staff members
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : escalatedComplaints.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No escalated complaints</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {escalatedComplaints.map((complaint) => (
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

              <h3 className="font-semibold text-slate-900 mb-2">
                {complaint.title || "Untitled Complaint"}
              </h3>

              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {complaint.categoryName}
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {complaint.residentName}
                </span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  Room {complaint.roomNumber}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {complaint.description}
              </p>

              {complaint.assignedStaffName && (
                <div className="text-xs text-slate-600 mb-3 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Currently assigned to: {complaint.assignedStaffName}
                </div>
              )}

              <button
                onClick={() => handleReassignClick(complaint)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Reassign
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reassignment Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-2 border-slate-500">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                Reassign Complaint
              </h2>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                <strong>Complaint:</strong>{" "}
                {selectedComplaint.title || "Untitled"}
              </p>
              <p className="text-sm text-slate-600 mb-2">
                <strong>Category:</strong> {selectedComplaint.categoryName}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Resident:</strong> {selectedComplaint.residentName}{" "}
                (Room {selectedComplaint.roomNumber})
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Staff Member
              </label>
              {isLoadingStaff ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-indigo-600"></div>
                </div>
              ) : availableStaff.length === 0 ? (
                <p className="text-sm text-red-600">
                  No staff available with specialization in{" "}
                  {selectedComplaint.categoryName}
                </p>
              ) : (
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Staff --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isReassigning}
              >
                Cancel
              </button>
              <button
                onClick={handleReassignConfirm}
                disabled={!selectedStaffId || isReassigning}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReassigning ? "Reassigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalatedComplaints;
