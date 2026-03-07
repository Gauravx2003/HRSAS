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

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6b7280"];

const LibrarianDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [overdues, setOverdues] = useState<OverdueEntry[]>([]);
  const [health, setHealth] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
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
                  <div className="text-right ml-3 flex-shrink-0">
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
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {health.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
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
