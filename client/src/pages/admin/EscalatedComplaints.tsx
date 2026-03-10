import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import {
  getStaffBySpecialization,
  reassignComplaint,
  type Staff,
} from "../../services/complaint.service";
import {
  AlertCircle,
  BarChart3,
  Clock,
  Download,
  FileText,
  History,
  Home,
  Loader2,
  User,
  X,
  UserPlus,
} from "lucide-react";

import EscalatedStatCards from "../../components/escalatedAnalytics/EscalatedStatCards";
import EscalatedTrendChart from "../../components/escalatedAnalytics/EscalatedTrendChart";
import EscalatedCategoryPieChart from "../../components/escalatedAnalytics/EscalatedCategoryPieChart";
import EscalatedBlockChart from "../../components/escalatedAnalytics/EscalatedBlockChart";
import EscalatedTopStaffTable from "../../components/escalatedAnalytics/EscalatedTopStaffTable";
import EscalatedTopResidentsTable from "../../components/escalatedAnalytics/EscalatedTopResidentsTable";
import EscalatedBlockCategoryTable from "../../components/escalatedAnalytics/EscalatedBlockCategoryTable";
import ReassignmentHistoryTable from "../../components/escalatedAnalytics/ReassignmentHistoryTable";
import { SkeletonCard } from "../../components/SkeletonCard";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  categoryName: string;
  residentName: string;
  roomNumber: string;
  block: string;
  assignedStaffName?: string;
  createdAt: string;
  priority: string;
}

const EscalatedComplaints = () => {
  const [activeTab, setActiveTab] = useState<
    "complaints" | "analytics" | "history"
  >("complaints");

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

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // History state
  const [reassignHistory, setReassignHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchEscalatedComplaints();
  }, []);

  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      fetchAnalytics();
    }
    if (activeTab === "history" && reassignHistory.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

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

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await api.get("/complaints/escalated/analytics");
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get("/complaints/reassignment-history");
      setReassignHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch reassignment history:", error);
    } finally {
      setHistoryLoading(false);
    }
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
      // Refresh history if it was loaded
      if (reassignHistory.length > 0) {
        fetchHistory();
      }
    } catch (error) {
      console.error("Error reassigning complaint:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toUpperCase()) {
      case "PLUMBING":
        return "bg-blue-100 text-blue-800";
      case "ELECTRICAL":
        return "bg-amber-100 text-amber-800";
      case "SECURITY":
        return "bg-red-100 text-red-800";
      case "IT SERVICES":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
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

  // Compute stats securely from existing props (could also wait for analytics to resolve)
  const stats = useMemo(() => {
    const today = new Date().toDateString();

    return {
      total: escalatedComplaints.length,
      critical: escalatedComplaints.filter(
        (c) => c.priority.toUpperCase() === "HIGH",
      ).length,
      resolvedToday: escalatedComplaints.filter(
        (c) =>
          c.status.toUpperCase() === "RESOLVED" &&
          new Date(c.createdAt).toDateString() === today,
      ).length,
    };
  }, [escalatedComplaints]);

  return (
    <div className="bg-[#f8f9fa] min-h-screen p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-8 h-8 text-red-500 font-bold" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Escalated Complaints
              </h1>
            </div>
            <p className="text-slate-500 text-base">
              High-priority issues requiring immediate reassignment or
              management oversight.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="border-b border-slate-200 flex gap-8">
          <button
            onClick={() => setActiveTab("complaints")}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-4 pt-4 px-2 transition-colors ${
              activeTab === "complaints"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-blue-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              <p className="text-sm font-bold tracking-wide text-slate-800">
                Escalated Complaints
              </p>
              <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {escalatedComplaints.length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-4 pt-4 px-2 transition-colors ${
              activeTab === "analytics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-blue-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <p className="text-sm font-bold tracking-wide text-slate-800">
                Statistics
              </p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-4 pt-4 px-2 transition-colors ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-blue-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <p className="text-sm font-bold tracking-wide text-slate-800">
                Reassignment History
              </p>
            </div>
          </button>
        </div>

        {/* ─── COMPLAINTS TAB ─── */}
        {activeTab === "complaints" && (
          <div className="space-y-8">
            {/* Top Stat Cards Section (Unique to Complaints View) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Critical Tasks
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {stats.critical < 10 && stats.critical > 0
                      ? `0${stats.critical}`
                      : stats.critical}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Avg. Response Time
                  </p>
                  <p className="text-2xl font-bold text-slate-900">1.2 hrs</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Resolved Today
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {stats.resolvedToday < 10 && stats.resolvedToday > 0
                      ? `0${stats.resolvedToday}`
                      : stats.resolvedToday}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto min-h-75">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : escalatedComplaints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-64">
                    <FileText className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-600 font-semibold">
                      No escalated complaints
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Complaint Details
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Resident Details
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Assigned Staff
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {escalatedComplaints.map((complaint) => (
                        <tr
                          key={complaint.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                                complaint.categoryName,
                              )}`}
                            >
                              {complaint.categoryName}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-sm">
                            <p className="text-slate-900 text-sm font-bold truncate">
                              {complaint.title || "Untitled Complaint"}
                            </p>
                            <p className="text-slate-500 text-xs mt-1 truncate">
                              {complaint.description}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <p className="text-slate-900 text-sm font-semibold">
                                {complaint.residentName}
                              </p>
                              <p className="text-slate-500 text-xs mt-1">
                                {complaint.block} -- Room {complaint.roomNumber}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {complaint.assignedStaffName ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                    {getInitials(complaint.assignedStaffName)}
                                  </div>
                                  <p className="text-slate-600 text-sm font-medium">
                                    {complaint.assignedStaffName}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <p className="text-slate-500 text-sm font-medium italic">
                                    Unassigned
                                  </p>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleReassignClick(complaint)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <UserPlus className="w-4 h-4" />
                              Reassign
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {!isLoading && escalatedComplaints.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing {escalatedComplaints.length} escalated complaints
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === "analytics" &&
          (analyticsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Stat Cards */}
              <EscalatedStatCards
                totalEscalations={analytics.totalEscalations}
                escalatedStatusCounts={analytics.escalatedStatusCounts}
                overallStatusCounts={analytics.overallStatusCounts}
              />

              {/* Trend Chart */}
              <EscalatedTrendChart dailyTrend={analytics.dailyTrend} />

              {/* Category + Block Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EscalatedCategoryPieChart
                  data={analytics.categoryDistribution}
                  blockCategoryData={analytics.blockCategoryData}
                />
                <EscalatedBlockChart data={analytics.blockDistribution} />
              </div>

              {/* Block × Category Heatmap */}
              <EscalatedBlockCategoryTable data={analytics.blockCategoryData} />

              {/* Top Staff + Top Residents Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EscalatedTopStaffTable data={analytics.topStaff} />
                <EscalatedTopResidentsTable data={analytics.topResidents} />
              </div>
            </div>
          ) : null)}

        {/* ─── HISTORY TAB ─── */}
        {activeTab === "history" && (
          <ReassignmentHistoryTable
            data={reassignHistory}
            isLoading={historyLoading}
          />
        )}
      </div>

      {/* Reassignment Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 bg-black/40">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Reassign Complaint
              </h2>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Modal Content - Complaint Summary */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                <p className="text-sm font-bold text-slate-900 line-clamp-1">
                  {selectedComplaint.title || "Untitled"}
                </p>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {selectedComplaint.description}
                </p>
                <div className="flex gap-2 pt-2 mt-2 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Category:
                    </span>{" "}
                    {selectedComplaint.categoryName}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Resident:
                    </span>{" "}
                    {selectedComplaint.residentName} (
                    {selectedComplaint.roomNumber})
                  </span>
                </div>
              </div>

              {/* Formal Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Select Staff Member <span className="text-red-500">*</span>
                </label>
                {isLoadingStaff ? (
                  <div className="flex justify-center py-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
                  </div>
                ) : availableStaff.length === 0 ? (
                  <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                    No staff available with specialization in{" "}
                    {selectedComplaint.categoryName}.
                  </div>
                ) : (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-700 cursor-pointer shadow-sm appearance-none"
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
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition-colors shadow-sm"
                disabled={isReassigning}
              >
                Cancel
              </button>
              <button
                onClick={handleReassignConfirm}
                disabled={!selectedStaffId || isReassigning}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isReassigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reassigning...
                  </>
                ) : (
                  "Confirm Reassignment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalatedComplaints;
