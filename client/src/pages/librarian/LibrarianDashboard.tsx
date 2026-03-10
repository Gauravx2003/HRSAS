import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  BookOpen,
  Library,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  Clock,
  Users,
  X,
  Wrench,
  Ban,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface Stats {
  totalTitles: number;
  totalCopies: number;
  currentlyOut: number;
  activeOverdues: number;
}

interface OverdueEntry {
  transactionId: string;
  residentName: string;
  residentEmail: string;
  roomNumber: string | null;
  bookTitle: string;
  dueDate: string;
  daysLate: number;
}

interface HealthEntry {
  name: string;
  value: number;
}

interface CopyEntry {
  copyId: string;
  status: string;
  createdAt: string;
  bookTitle: string;
  bookAuthor: string;
  bookId: string;
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6b7280"];

const LibrarianDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [overdues, setOverdues] = useState<OverdueEntry[]>([]);
  const [health, setHealth] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Copies modal state
  const [copiesModal, setCopiesModal] = useState<
    "MAINTENANCE" | "LOST_FOREVER" | null
  >(null);
  const [copies, setCopies] = useState<CopyEntry[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, overduesRes, healthRes] = await Promise.all([
        api.get("/library/dashboard/stats"),
        api.get("/library/dashboard/overdues"),
        api.get("/library/dashboard/health"),
      ]);
      setStats(statsRes.data);
      setOverdues(overduesRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCopiesModal = async (status: "MAINTENANCE" | "LOST_FOREVER") => {
    setCopiesModal(status);
    try {
      setLoadingCopies(true);
      const res = await api.get(`/library/copies-by-status?status=${status}`);
      setCopies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleReactivate = async (copyId: string) => {
    try {
      setReactivatingId(copyId);
      await api.patch(`/library/copies/${copyId}/reactivate`);
      setCopies((prev) => prev.filter((c) => c.copyId !== copyId));
      // Refresh pie chart data
      const healthRes = await api.get("/library/dashboard/health");
      setHealth(healthRes.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reactivate copy");
    } finally {
      setReactivatingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Library Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of library operations and health
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Titles"
            value={stats.totalTitles}
            icon={<BookOpen className="w-5 h-5" />}
            color="indigo"
          />
          <StatCard
            label="Physical Copies"
            value={stats.totalCopies}
            icon={<Library className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            label="Currently Out"
            value={stats.currentlyOut}
            icon={<ArrowUpRight className="w-5 h-5" />}
            color="amber"
          />
          <StatCard
            label="Active Overdues"
            value={stats.activeOverdues}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Needed Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-slate-800">
              Action Needed — Overdue Books
            </h2>
          </div>
          {overdues.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No overdue books 🎉</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
              {overdues.map((o) => (
                <div
                  key={o.transactionId}
                  className="flex items-start justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {o.bookTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600">
                        {o.residentName}
                        {o.roomNumber && ` • Room ${o.roomNumber}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      {o.daysLate}d late
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Health Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">
            Inventory Health
          </h2>
          {health.every((h) => h.value === 0) ? (
            <div className="text-center py-8">
              <Library className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No copies in system yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={health.filter((h) => h.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent = 0 }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  onClick={(_, idx) => {
                    const visible = health.filter((h) => h.value > 0);
                    const clicked = visible[idx];
                    if (!clicked) return;
                    if (clicked.name === "Damaged/Maintenance")
                      openCopiesModal("MAINTENANCE");
                    else if (clicked.name === "Lost")
                      openCopiesModal("LOST_FOREVER");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {health
                    .filter((h) => h.value > 0)
                    .map((entry, idx) => {
                      const originalIdx = health.findIndex(
                        (h) => h.name === entry.name,
                      );
                      return (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[originalIdx % PIE_COLORS.length]}
                          className={
                            entry.name === "Damaged/Maintenance" ||
                            entry.name === "Lost"
                              ? "cursor-pointer"
                              : ""
                          }
                        />
                      );
                    })}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-slate-400 text-center mt-2">
            Click on <span className="font-semibold">Damaged/Maintenance</span>{" "}
            or <span className="font-semibold">Lost</span> to view copies
          </p>
        </div>
      </div>

      {/* ── Copies Modal ──────────────────────────── */}
      {copiesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {copiesModal === "MAINTENANCE" ? (
                    <Wrench className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Ban className="w-5 h-5 text-red-500" />
                  )}
                  <h3 className="text-lg font-bold text-slate-800">
                    {copiesModal === "MAINTENANCE"
                      ? "Damaged / Maintenance Copies"
                      : "Lost Copies"}
                  </h3>
                </div>
                <button
                  onClick={() => setCopiesModal(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {loadingCopies ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : copies.length === 0 ? (
                <div className="text-center py-8">
                  <Library className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    No {copiesModal === "MAINTENANCE" ? "maintenance" : "lost"}{" "}
                    copies found
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                  {copies.map((c) => (
                    <div
                      key={c.copyId}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {c.bookTitle}
                        </p>
                        <p className="text-xs text-slate-500">{c.bookAuthor}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          Copy: {c.copyId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      {copiesModal === "MAINTENANCE" && (
                        <button
                          onClick={() => handleReactivate(c.copyId)}
                          disabled={reactivatingId === c.copyId}
                          className="flex items-center gap-1.5 ml-3 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
                        >
                          {reactivatingId === c.copyId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Mark Active
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Stat Card ──────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-50 text-slate-600",
  };
  const classes = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${classes}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
};

export default LibrarianDashboard;
