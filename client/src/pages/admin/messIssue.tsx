import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import { useToast } from "../../components/common/Toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  X,
  BarChart3,
  Loader2,
  Download,
  Search,
  Eye,
  Filter,
} from "lucide-react";

import MessStatCards from "../../components/messAnalytics/MessStatCards";
import MessTrendChart from "../../components/messAnalytics/MessTrendChart";
import MessCategoryPieChart from "../../components/messAnalytics/MessCategoryPieChart";
import MessCategoryTable from "../../components/messAnalytics/MessCategoryTable";

import AdminContractorTab from "../../components/messAnalytics/AdminContractorTab";
import MessWastageStats from "../../components/messAnalytics/MessWastageStats";
import { UserCog, Leaf } from "lucide-react";

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
    "issues" | "analytics" | "contractor" | "smart_mess"
  >("issues");
  const [issues, setIssues] = useState<MessIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<
    "ALL" | "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [wastageData, setWastageData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Sidepanel Modal State
  const [selectedIssue, setSelectedIssue] = useState<MessIssue | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

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
      let endpoint = "/mess-issues?";
      if (filter !== "ALL") endpoint += `status=${filter}&`;

      const response = await api.get(endpoint.slice(0, -1));
      let fetchedIssues = response.data;

      // if (categoryFilter !== "ALL") {
      //   fetchedIssues = fetchedIssues.filter(
      //     (issue: MessIssue) => issue.category === categoryFilter,
      //   );
      // }

      setIssues(fetchedIssues);
    } catch (error) {
      console.error("Failed to fetch mess issues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const [analyticsRes, wastageRes] = await Promise.all([
        api.get("/mess-issues/analytics"),
        api.get("/smart-mess/analytics/wastage"),
      ]);
      setAnalytics(analyticsRes.data);
      setWastageData(wastageRes.data);
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

      if (status === "IN_REVIEW") {
        showToast("Issue moved to In Review", "info");
      } else if (status === "REJECTED") {
        showToast("Issue has been rejected", "warning");
      } else if (status === "RESOLVED") {
        showToast("Issue resolved successfully!", "success");
      }

      fetchIssues();

      if (selectedIssue && selectedIssue.id === id) {
        closeSidepanel();
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

  const openSidepanel = (issue: MessIssue) => {
    setSelectedIssue(issue);
    setSelectedStatus(issue.status);
    setAdminResponse(issue.adminResponse || "");
  };

  const closeSidepanel = () => {
    setSelectedIssue(null);
    setSelectedStatus("");
    setAdminResponse("");
  };

  const handleSaveChanges = () => {
    if (!selectedIssue) return;

    if (selectedStatus === "RESOLVED" && !adminResponse.trim()) {
      showToast("Admin response is required to resolve the issue.", "warning");
      return;
    }

    // Only update if status or response actually changed
    if (
      selectedStatus !== selectedIssue.status ||
      (selectedStatus === "RESOLVED" &&
        adminResponse !== selectedIssue.adminResponse)
    ) {
      updateStatus(selectedIssue.id, selectedStatus, adminResponse);
    } else {
      closeSidepanel();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return {
          label: "Resolved",
          dotClass: "bg-green-500",
          colorClass: "bg-green-50 text-green-700",
        };
      case "REJECTED":
        return {
          label: "Rejected",
          dotClass: "bg-slate-400",
          colorClass: "bg-slate-50 text-slate-700",
        };
      case "IN_REVIEW":
        return {
          label: "In Review",
          dotClass: "bg-blue-500",
          colorClass: "bg-blue-50 text-blue-700",
        };
      case "OPEN":
      default:
        return {
          label: "Open",
          dotClass: "bg-orange-500",
          colorClass: "bg-orange-50 text-orange-700",
        };
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toUpperCase()) {
      case "FOOD_QUALITY":
        return "bg-rose-50 text-rose-600";
      case "HYGIENE":
        return "bg-purple-50 text-purple-600";
      case "SERVICE":
      case "SERVICE_DELAY":
        return "bg-indigo-50 text-indigo-600";
      default:
        return "bg-slate-100 text-slate-600";
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtered issues based on search
  const filteredIssues = useMemo(() => {
    return issues.filter(
      (issue) =>
        issue.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.issueTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.roomNumber.includes(searchQuery),
    );
  }, [issues, searchQuery]);

  // Derived stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      open: issues.filter((i) => i.status === "OPEN").length,
      inReview: issues.filter((i) => i.status === "IN_REVIEW").length,
      resolvedToday: issues.filter(
        (i) =>
          i.status === "RESOLVED" &&
          new Date(i.createdAt).toDateString() === today,
      ).length,
    };
  }, [issues]);

  return (
    <div className="bg-[#f8f9fa] min-h-screen p-6 font-sans text-slate-900 flex">
      <div className="max-w-7xl w-full mx-auto space-y-6 transition-all duration-300">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Mess Issues Management
            </h1>
            <p className="text-slate-500 text-base">
              Monitor food quality, hygiene reports, and service feedback from
              residents.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by name, room, or issue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center rounded-lg h-9 w-9 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
              <AlertCircle className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Filters/Tabs Section */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab("issues")}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold bg-white shadow-sm transition-colors ${activeTab === "issues" ? "border-blue-500 text-blue-700" : "border-slate-200 text-slate-700"}`}
          >
            <Filter className="w-4 h-4" />
            All Categories
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold bg-white shadow-sm transition-colors ${activeTab === "analytics" ? "border-blue-500 text-blue-700" : "border-slate-200 text-slate-700"}`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("contractor")}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold bg-white shadow-sm transition-colors ${activeTab === "contractor" ? "border-blue-500 text-blue-700" : "border-slate-200 text-slate-700"}`}
          >
            <UserCog className="w-4 h-4" />
            Contractor
          </button>
          <button
            onClick={() => setActiveTab("smart_mess")}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold bg-white shadow-sm transition-colors ${activeTab === "smart_mess" ? "border-blue-500 text-blue-700" : "border-slate-200 text-slate-700"}`}
          >
            <Leaf className="w-4 h-4" />
            Smart Mess
          </button>

          <div className="h-6 w-px bg-slate-300 mx-1"></div>

          {activeTab === "issues" && (
            <select
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-slate-700 shadow-sm appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-size-[10px_10px] bg-no-repeat bg-position-[right_10px_center]"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="ALL">Status: All</option>
              <option value="OPEN">Status: Open</option>
              <option value="IN_REVIEW">Status: In Review</option>
              <option value="RESOLVED">Status: Resolved</option>
            </select>
          )}

          {activeTab === "issues" && (
            <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-slate-700 shadow-sm appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-size-[10px_10px] bg-no-repeat bg-position-[right_10px_center]">
              <option>Sort: Newest First</option>
            </select>
          )}

          {activeTab === "issues" && (
            <select
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-slate-700 shadow-sm appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-size-[10px_10px] bg-no-repeat bg-position-[right_10px_center]"
              id="categoryFilter"
            >
              <option value="ALL">Category: All</option>
              <option value="FOOD_QUALITY">Food Quality</option>
              <option value="HYGIENE">Hygiene</option>
              <option value="SERVICE">Service</option>
              <option value="OTHER">Other</option>
            </select>
          )}
        </div>

        {/* ─── CONTRACTOR TAB ─── */}
        {activeTab === "contractor" && <AdminContractorTab />}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === "analytics" &&
          (analyticsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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

        {/* Wastage Analytics Section */}
        {activeTab === "smart_mess" && wastageData && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-1 bg-green-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-600" />
                Food Wastage & Resource Efficiency
              </h2>
            </div>
            <MessWastageStats data={wastageData} />
          </div>
        )}

        {/* ─── ISSUES TAB ─── */}
        {activeTab === "issues" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto min-h-75">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-64">
                    <FileText className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="font-semibold">No mess issues found</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Resident Info
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Issue Details
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Status
                        </th>
                        {/* <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                          Media
                        </th> */}
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIssues.map((issue) => {
                        const statusBadge = getStatusBadge(issue.status);
                        const initials = getInitials(issue.residentName);
                        return (
                          <tr
                            key={issue.id}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => openSidepanel(issue)}
                          >
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {initials}
                                  </div>
                                  <p className="text-slate-900 text-sm font-bold">
                                    {issue.residentName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-slate-500 text-xs mt-0.5 ml-10">
                                    Block {issue.block} • Room{" "}
                                    {issue.roomNumber}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 max-w-sm">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getCategoryColor(issue.category)}`}
                                >
                                  {issue.category.replace("_", " ")}
                                </span>
                                <span className="text-slate-400 text-[11px] font-medium">
                                  {formatDate(issue.createdAt)}
                                </span>
                              </div>
                              <p className="text-slate-900 text-sm font-semibold mb-0.5 truncate">
                                {issue.issueTitle}
                              </p>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusBadge.colorClass}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass}`}
                                ></span>
                                {statusBadge.label}
                              </span>
                            </td>
                            {/* <td className="px-6 py-5 whitespace-nowrap text-slate-500 text-xs italic">
                              {issue.attachments &&
                              issue.attachments.length > 0 ? (
                                <div className="flex -space-x-2">
                                  {issue.attachments
                                    .slice(0, 2)
                                    .map((att, i) => (
                                      <div
                                        key={i}
                                        className="w-8 h-8 rounded border-2 border-white bg-slate-200 overflow-hidden shadow-sm"
                                      >
                                        <img
                                          src={att.fileURL}
                                          alt="attachment"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  {issue.attachments.length > 2 && (
                                    <div className="w-8 h-8 rounded border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                                      +{issue.attachments.length - 2}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                "No media"
                              )}
                            </td> */}
                            <td className="px-6 py-5 text-right whitespace-nowrap">
                              {issue.status === "OPEN" ? (
                                <button
                                  className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors"
                                  onClick={() => setSelectedStatus("IN_REVIEW")}
                                >
                                  Review
                                </button>
                              ) : issue.status === "IN_REVIEW" ? (
                                <button className="inline-flex items-center justify-center px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors">
                                  Resolve
                                </button>
                              ) : (
                                <button className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {!isLoading && filteredIssues.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing {filteredIssues.length} pending issues
                  </p>
                  <div className="flex items-center gap-1">
                    <button className="flex size-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                      {"<"}
                    </button>
                    <button className="size-8 flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm shadow-blue-600/20">
                      1
                    </button>
                    <button className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors">
                      2
                    </button>
                    <button className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors">
                      3
                    </button>
                    <button className="flex size-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                      {">"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Open Issues
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {stats.open < 10 ? `0${stats.open}` : stats.open}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                  <Eye className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    In Review
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {stats.inReview < 10
                      ? `0${stats.inReview}`
                      : stats.inReview}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Resolved Today
                  </p>
                  <p className="text-3xl font-black text-slate-900">
                    {stats.resolvedToday < 10
                      ? `0${stats.resolvedToday}`
                      : stats.resolvedToday}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay backgound for sidepanel */}
      {selectedIssue && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={closeSidepanel}
        ></div>
      )}

      {/* Sidepanel Model */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedIssue ? "translate-x-0" : "translate-x-full"}`}
      >
        {selectedIssue && (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                Issue Details
              </h2>
              <button
                onClick={closeSidepanel}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {/* Issue Identification */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${getStatusBadge(selectedIssue.status).colorClass}`}
                  >
                    {selectedIssue.status.replace("_", " ")}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    #ISS-{selectedIssue.id.substring(0, 6)}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    {formatDate(selectedIssue.createdAt)}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  {selectedIssue.issueTitle}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedIssue.issueDescription}
                </p>
              </div>

              {/* Resident Info Card */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Reported By
                </p>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg shrink-0">
                    {getInitials(selectedIssue.residentName)}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedIssue.residentName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Engineering Undergraduate
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Room
                        </p>
                        <p className="text-xs font-medium text-slate-700">
                          Block {selectedIssue.block},{" "}
                          {selectedIssue.roomNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Phone
                        </p>
                        <p className="text-xs font-medium text-slate-700">
                          {selectedIssue.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="mb-8">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Attachments ({selectedIssue.attachments?.length || 0})
                </p>
                {selectedIssue.attachments &&
                selectedIssue.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedIssue.attachments.map((att, index) => (
                      <div
                        key={index}
                        className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:shadow-md transition-shadow cursor-zoom-in"
                      >
                        <img
                          src={att.fileURL}
                          alt="attachment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100 p-4 shrink flex justify-center items-center">
                    No media available for this issue.
                  </div>
                )}
              </div>

              <hr className="border-slate-100 mb-8" />

              {/* Update Status Section */}
              {selectedIssue.status !== "RESOLVED" ? (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Update Status
                  </p>

                  <div className="space-y-3">
                    {/* In Review Option */}
                    <label
                      className={`block border rounded-xl p-4 cursor-pointer transition-all ${selectedStatus === "IN_REVIEW" ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-slate-200 hover:border-blue-300"}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <input
                            type="radio"
                            name="statusUpdate"
                            value="IN_REVIEW"
                            checked={selectedStatus === "IN_REVIEW"}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600"
                          />
                        </div>
                        <div>
                          <p
                            className={`font-bold text-sm ${selectedStatus === "IN_REVIEW" ? "text-blue-900" : "text-slate-900"}`}
                          >
                            In Review
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Currently being investigated by kitchen staff
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Resolved Option */}
                    {selectedIssue?.status == "IN_REVIEW" && (
                      <label
                        className={`block border rounded-xl p-4 cursor-pointer transition-all ${selectedStatus === "RESOLVED" ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-slate-200 hover:border-blue-300"}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="pt-1">
                            <input
                              type="radio"
                              name="statusUpdate"
                              value="RESOLVED"
                              checked={selectedStatus === "RESOLVED"}
                              onChange={(e) =>
                                setSelectedStatus(e.target.value)
                              }
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600"
                            />
                          </div>
                          <div className="w-full">
                            <p
                              className={`font-bold text-sm ${selectedStatus === "RESOLVED" ? "text-blue-900" : "text-slate-900"}`}
                            >
                              Resolved
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 mb-3">
                              Issue has been fixed and resident notified
                            </p>

                            {/* Admin Response Box (Conditionally Shown) */}
                            {selectedStatus === "RESOLVED" && (
                              <div className="mt-2 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                <textarea
                                  value={adminResponse}
                                  onChange={(e) =>
                                    setAdminResponse(e.target.value)
                                  }
                                  placeholder="Admin Response (e.g. Action taken by kitchen...)"
                                  rows={3}
                                  className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none shadow-sm placeholder:text-slate-400"
                                  onClick={(e) => e.stopPropagation()}
                                ></textarea>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    )}

                    {/* Rejected Option */}
                    <label
                      className={`block border rounded-xl p-4 cursor-pointer transition-all ${selectedStatus === "REJECTED" ? "border-blue-500 bg-blue-50/50 shadow-sm" : "border-slate-200 hover:border-blue-300"}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <input
                            type="radio"
                            name="statusUpdate"
                            value="REJECTED"
                            checked={selectedStatus === "REJECTED"}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600"
                          />
                        </div>
                        <div>
                          <p
                            className={`font-bold text-sm ${selectedStatus === "REJECTED" ? "text-blue-900" : "text-slate-900"}`}
                          >
                            Rejected
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Not a valid mess management issue
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Admin Response
                  </p>
                  <p className="text-lg text-slate-900">
                    {selectedIssue.adminResponse}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={closeSidepanel}
                disabled={isUpdating}
                className="px-6 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 font-bold text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessIssueManagement;
