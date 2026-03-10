import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../components/common/Toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquareWarning,
  Home,
  User,
  X,
  Phone,
  BarChart3,
  Loader2,
} from "lucide-react";

import AttachmentPreview from "../../components/AttachmentPreview";
import MessStatCards from "../../components/messAnalytics/MessStatCards";
import MessTrendChart from "../../components/messAnalytics/MessTrendChart";
import MessCategoryPieChart from "../../components/messAnalytics/MessCategoryPieChart";
import MessCategoryTable from "../../components/messAnalytics/MessCategoryTable";
import { SkeletonCard } from "../../components/SkeletonCard";
import AdminContractorTab from "../../components/messAnalytics/AdminContractorTab";
import { UserCog } from "lucide-react";

interface MessIssue {
  id: string;
  issueTitle: string;
  issueDescription: string;
  category: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  adminResponse?: string;
  createdAt: string;
  residentName: string;
  roomNumber: string;
  block: string;
  phone: string;
  attachments?: Array<{ id: string; fileURL: string }>;
}

const MessIssueManagement = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "issues" | "analytics" | "contractor"
  >("issues");
  const [issues, setIssues] = useState<MessIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<
    "ALL" | "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED"
  >("OPEN");

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Modal State
  const [selectedIssue, setSelectedIssue] = useState<MessIssue | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, [filter]);

  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      let endpoint = "/mess-issues";
      if (filter !== "ALL") {
        endpoint += `?status=${filter}`;
      }

      const response = await api.get(endpoint);
      setIssues(response.data);
    } catch (error) {
      console.error("Failed to fetch mess issues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await api.get("/mess-issues/analytics");
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: string,
    response?: string,
  ) => {
    try {
      setIsUpdating(true);
      await api.patch(`/mess-issues/update/${id}`, {
        status,
        adminResponse: response,
      });

      // Show status-specific toast
      if (status === "IN_REVIEW") {
        showToast("Issue moved to In Review", "info");
      } else if (status === "REJECTED") {
        showToast("Issue has been rejected", "warning");
      } else if (status === "RESOLVED") {
        showToast("Issue resolved successfully!", "success");
      }

      fetchIssues();

      // Close modal if open
      if (selectedIssue && selectedIssue.id === id) {
        closeModal();
      }
    } catch (error: any) {
      console.error(
        "Failed to update issue:",
        error.response?.data?.error || error.message,
      );
      showToast(
        error.response?.data?.error || "Failed to update issue",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReview = (id: string) => {
    updateStatus(id, "IN_REVIEW");
  };

  const handleReject = (id: string) => {
    updateStatus(id, "REJECTED");
  };

  const openResolveModal = (issue: MessIssue) => {
    setSelectedIssue(issue);
    setAdminResponse(issue.adminResponse || "");
  };

  const closeModal = () => {
    setSelectedIssue(null);
    setAdminResponse("");
  };

  const submitResolution = () => {
    if (!selectedIssue) return;
    if (!adminResponse.trim()) {
      showToast("Admin response is required to resolve the issue.", "warning");
      return;
    }
    updateStatus(selectedIssue.id, "RESOLVED", adminResponse);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return {
          label: "Resolved",
          icon: <CheckCircle2 className="w-3 h-3" />,
          color: "bg-green-100 text-green-700 border-green-200",
        };
      case "REJECTED":
        return {
          label: "Rejected",
          icon: <AlertCircle className="w-3 h-3" />,
          color: "bg-red-100 text-red-700 border-red-200",
        };
      case "IN_REVIEW":
        return {
          label: "In Review",
          icon: <Clock className="w-3 h-3" />,
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "OPEN":
      default:
        return {
          label: "Open",
          icon: <AlertCircle className="w-3 h-3" />,
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <MessageSquareWarning className="w-6 h-6 text-indigo-600" />
          Mess Issues Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and resolve mess-related complaints from residents
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("issues")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "issues"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4" />
            Issues
          </div>
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </div>
        </button>
        <button
          onClick={() => setActiveTab("contractor")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "contractor"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Contractor
          </div>
        </button>
      </div>

      {/* ─── CONTRACTOR TAB ─── */}
      {activeTab === "contractor" && <AdminContractorTab />}

      {/* ─── ANALYTICS TAB ─── */}
      {activeTab === "analytics" &&
        (analyticsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            <MessStatCards statusCounts={analytics.statusCounts} />
            <MessTrendChart dailyTrend={analytics.dailyTrend} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MessCategoryPieChart data={analytics.categoryDistribution} />
              <MessCategoryTable data={analytics.categoryDistribution} />
            </div>
          </div>
        ) : null)}

      {/* ─── ISSUES TAB ─── */}
      {activeTab === "issues" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {(
              ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED", "ALL"] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No mess issues found</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {issues.map((issue) => {
                const statusBadge = getStatusBadge(issue.status);

                return (
                  <div
                    key={issue.id}
                    className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow flex flex-col h-full"
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${statusBadge.color}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {issue.category}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-900 mb-3 text-lg">
                      {issue.issueTitle}
                    </h3>

                    {/* Resident Info Row */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-sm flex-1 min-w-0">
                        <span className="font-medium text-slate-700 block truncate">
                          {issue.residentName}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            <span>
                              {issue.block}-{issue.roomNumber}
                            </span>
                          </div>
                          {issue.phone && (
                            <div className="flex items-center gap-1 truncate">
                              <Phone className="w-3 h-3" />
                              <span>{issue.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-slate-50 rounded-lg p-3 mb-4 grow">
                      <span className="text-slate-500 text-xs block mb-1">
                        Description
                      </span>
                      <p className="text-sm text-slate-700 line-clamp-3">
                        {issue.issueDescription}
                      </p>
                    </div>

                    {/* Attachments Preview */}
                    <div className="mb-4">
                      <span className="text-slate-500 text-xs block mb-2">
                        Attachments
                      </span>
                      {issue.attachments && issue.attachments.length > 0 ? (
                        <AttachmentPreview attachments={issue.attachments} />
                      ) : (
                        <div className="text-sm text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100 p-3 flex justify-center items-center">
                          No attachments
                        </div>
                      )}
                    </div>

                    {/* Admin Response (If exists) */}
                    {issue.adminResponse && (
                      <div className="bg-green-50 rounded-lg p-3 mb-4">
                        <span className="text-green-800 text-xs font-semibold block mb-1">
                          Admin Response
                        </span>
                        <p className="text-sm text-green-700 italic">
                          "{issue.adminResponse}"
                        </p>
                      </div>
                    )}

                    {/* Actions Footer */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end gap-2">
                      {issue.status === "OPEN" && (
                        <button
                          onClick={() => handleReview(issue.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium w-full"
                        >
                          Start Review
                        </button>
                      )}

                      {issue.status === "IN_REVIEW" && (
                        <>
                          <button
                            onClick={() => handleReject(issue.id)}
                            className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-sm font-medium flex-1"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => openResolveModal(issue)}
                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors text-sm font-medium flex-1"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Resolve Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-2 border-slate-200 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Resolve Issue
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-1 font-medium">
                Provide Resident Feedback
              </p>
              <p className="text-xs text-slate-500 mb-3">
                This response will be visible to {selectedIssue.residentName}{" "}
                regarding their issue: "{selectedIssue.issueTitle}"
              </p>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="e.g., We have inspected the food and changed the vendor for today."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={submitResolution}
                disabled={!adminResponse.trim() || isUpdating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isUpdating ? "Resolving..." : "Submit Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessIssueManagement;
