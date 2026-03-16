import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  WashingMachine,
  Users,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  Wrench,
  Zap,
  TrendingUp,
  CalendarClock,
  UserPlus,
  X,
  RefreshCw,
  Plus,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ─── Types ───────────────────────────────────────
interface Resource {
  id: string;
  name: string;
  type: string;
  isOperational: boolean;
  maintenance: string | null;
  liveStatus: "AVAILABLE" | "IN_USE" | "FULLY_BOOKED" | "MAINTENANCE";
  currentUser: string | null;
  availableAt: string | null;
  slotsLeft: number;
}

interface ActiveBooking {
  id: string;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  machineName: string;
}

interface WaitlistEntry {
  id: string;
  userId: string;
  type: string;
  status: string;
  joinedAt: string;
  userName: string;
  userEmail: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface FlakeData {
  total: number;
  completed: number;
  cancelled: number;
  confirmed: number;
  active: number;
  flakeRate: number;
}

interface HeatmapCell {
  day_of_week: number;
  hour: number;
  booking_count: number;
}

interface WaitlistTurnaround {
  total_fulfilled: number;
  avg_wait_minutes: number;
}

// ─── Helpers ─────────────────────────────────────
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 16 }, (_, i) => {
  const h = i + 7; // 7 AM to 10 PM
  return h <= 12 ? `${h}AM` : `${h - 12}PM`;
});

const STATUS_CONFIG = {
  AVAILABLE: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Available",
  },
  IN_USE: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "In Use",
  },
  FULLY_BOOKED: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    dot: "bg-orange-500",
    label: "Fully Booked",
  },
  MAINTENANCE: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Maintenance",
  },
};

const PIE_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

// ─── Component ───────────────────────────────────
const LaundryManagement = () => {
  const [tab, setTab] = useState<"operations" | "analytics">("operations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Operations
  const [machines, setMachines] = useState<Resource[]>([]);
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Analytics
  const [flakeData, setFlakeData] = useState<FlakeData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [turnaround, setTurnaround] = useState<WaitlistTurnaround | null>(null);

  // Modals
  const [maintenanceModal, setMaintenanceModal] = useState<Resource | null>(
    null,
  );
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [bypassModal, setBypassModal] = useState(false);
  const [bypassUserId, setBypassUserId] = useState("");
  const [bypassResourceId, setBypassResourceId] = useState("");
  const [bypassSlots, setBypassSlots] = useState<TimeSlot[]>([]);
  const [bypassSelectedSlot, setBypassSelectedSlot] = useState<TimeSlot | null>(
    null,
  );
  const [loadingBypassSlots, setLoadingBypassSlots] = useState(false);
  const [addMachineModal, setAddMachineModal] = useState(false);
  const [newMachineName, setNewMachineName] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Fetch Data ──────────────────────────────
  const fetchOperationsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [machinesRes, bookingsRes, waitlistRes] = await Promise.all([
        api.get("/orchestrator/resources"),
        api.get("/orchestrator/orchestrator/active-bookings"),
        api.get("/orchestrator/orchestrator/waitlist"),
      ]);
      setMachines(machinesRes.data);
      setActiveBookings(bookingsRes.data);
      setWaitlist(waitlistRes.data);
    } catch (err: any) {
      console.error("Failed to fetch operations data:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load operations data. Check console for details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [flakeRes, heatmapRes, turnaroundRes] = await Promise.all([
        api.get("/orchestrator/orchestrator/analytics/flake-rate"),
        api.get("/orchestrator/orchestrator/analytics/heatmap"),
        api.get("/orchestrator/orchestrator/analytics/waitlist-turnaround"),
      ]);
      setFlakeData(flakeRes.data);
      setHeatmap(heatmapRes.data);
      setTurnaround(turnaroundRes.data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "operations") fetchOperationsData();
    else fetchAnalyticsData();
  }, [tab]);

  // ─── Handlers ────────────────────────────────
  const handleForceRelease = async (bookingId: string) => {
    if (
      !confirm(
        "Force release this booking? The next waitlisted student will be auto-assigned.",
      )
    )
      return;
    try {
      setActionLoading(bookingId);
      await api.post(`/orchestrator/orchestrator/force-cancel/${bookingId}`);
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to force release");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetMaintenance = async () => {
    if (!maintenanceModal) return;
    try {
      setActionLoading(maintenanceModal.id);
      await api.patch(
        `/orchestrator/orchestrator/resource/${maintenanceModal.id}`,
        {
          isOperational: false,
          maintenance: maintenanceReason || "General Maintenance",
        },
      );
      setMaintenanceModal(null);
      setMaintenanceReason("");
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to set maintenance");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearMaintenance = async (resourceId: string) => {
    try {
      setActionLoading(resourceId);
      await api.patch(`/orchestrator/orchestrator/resource/${resourceId}`, {
        isOperational: true,
      });
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to clear maintenance");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBypassFetchSlots = async (resourceId: string) => {
    try {
      setLoadingBypassSlots(true);
      setBypassResourceId(resourceId);
      const res = await api.get(`/orchestrator/resources/${resourceId}/slots`);
      setBypassSlots(res.data);
    } catch (err) {
      console.error("Failed to fetch slots:", err);
    } finally {
      setLoadingBypassSlots(false);
    }
  };

  const handleBypassQueue = async () => {
    if (!bypassUserId || !bypassResourceId || !bypassSelectedSlot) return;
    try {
      setActionLoading("bypass");
      await api.post("/orchestrator/orchestrator/bypass-queue", {
        userId: bypassUserId,
        resourceId: bypassResourceId,
        startTime: bypassSelectedSlot.startTime,
        endTime: bypassSelectedSlot.endTime,
      });
      setBypassModal(false);
      setBypassUserId("");
      setBypassResourceId("");
      setBypassSelectedSlot(null);
      setBypassSlots([]);
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to bypass queue");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMachine = async () => {
    if (!newMachineName.trim()) return;
    try {
      setActionLoading("add-machine");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await api.post("/orchestrator/orchestrator/resource", {
        name: newMachineName.trim(),
        type: "LAUNDRY",
        hostelId: user.hostelId,
      });
      setAddMachineModal(false);
      setNewMachineName("");
      fetchOperationsData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add machine");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Heatmap Helpers ─────────────────────────
  const getHeatmapColor = (count: number, max: number) => {
    if (count === 0) return "bg-slate-50";
    const intensity = count / max;
    if (intensity < 0.25) return "bg-blue-100";
    if (intensity < 0.5) return "bg-blue-300";
    if (intensity < 0.75) return "bg-blue-500 text-white";
    return "bg-blue-700 text-white";
  };

  const heatmapMax = Math.max(
    ...heatmap.map((h) => Number(h.booking_count)),
    1,
  );

  const getHeatmapCount = (day: number, hour: number) => {
    const cell = heatmap.find(
      (h) => Number(h.day_of_week) === day && Number(h.hour) === hour,
    );
    return cell ? Number(cell.booking_count) : 0;
  };

  // ─── Stats Cards ─────────────────────────────
  const availableCount = machines.filter(
    (m) => m.liveStatus === "AVAILABLE",
  ).length;
  const inUseCount = machines.filter((m) => m.liveStatus === "IN_USE").length;
  const maintenanceCount = machines.filter(
    (m) => m.liveStatus === "MAINTENANCE",
  ).length;

  // ─── Render ──────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Laundry Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage machines, bookings, and view analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddMachineModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Machine
          </button>
          <button
            onClick={() =>
              tab === "operations"
                ? fetchOperationsData()
                : fetchAnalyticsData()
            }
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("operations")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "operations"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <WashingMachine className="w-4 h-4" />
          Operations
        </button>
        <button
          onClick={() => setTab("analytics")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "analytics"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600" />
        </div>
      ) : tab === "operations" ? (
        <OperationsTab
          machines={machines}
          activeBookings={activeBookings}
          waitlist={waitlist}
          availableCount={availableCount}
          inUseCount={inUseCount}
          maintenanceCount={maintenanceCount}
          actionLoading={actionLoading}
          onForceRelease={handleForceRelease}
          onSetMaintenance={(m) => {
            setMaintenanceModal(m);
            setMaintenanceReason("");
          }}
          onClearMaintenance={handleClearMaintenance}
          onOpenBypassModal={() => setBypassModal(true)}
        />
      ) : (
        <AnalyticsTab
          flakeData={flakeData}
          heatmap={heatmap}
          turnaround={turnaround}
          heatmapMax={heatmapMax}
          getHeatmapCount={getHeatmapCount}
          getHeatmapColor={getHeatmapColor}
        />
      )}

      {/* ── Maintenance Modal ──────────────────── */}
      {maintenanceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Set Maintenance
                </h3>
                <button
                  onClick={() => setMaintenanceModal(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Mark{" "}
                <span className="font-semibold text-slate-700">
                  {maintenanceModal.name}
                </span>{" "}
                as under maintenance. Students will see the reason you provide.
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reason
              </label>
              <input
                type="text"
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="e.g., Motor Repair, Belt Replacement"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setMaintenanceModal(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetMaintenance}
                  disabled={actionLoading === maintenanceModal.id}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === maintenanceModal.id
                    ? "Setting..."
                    : "Set Maintenance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bypass Queue Modal ─────────────────── */}
      {bypassModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Bypass Queue
                </h3>
                <button
                  onClick={() => {
                    setBypassModal(false);
                    setBypassSlots([]);
                    setBypassSelectedSlot(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Manually assign a slot to a specific student, overriding the
                waitlist.
              </p>

              {/* Student ID */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Student User ID
              </label>
              <input
                type="text"
                value={bypassUserId}
                onChange={(e) => setBypassUserId(e.target.value)}
                placeholder="Paste the student's user ID"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />

              {/* Machine Selection */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Select Machine
              </label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {machines
                  .filter((m) => m.isOperational)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleBypassFetchSlots(m.id)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        bypassResourceId === m.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
              </div>

              {/* Slot Selection */}
              {bypassResourceId && (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Select Slot
                  </label>
                  {loadingBypassSlots ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-indigo-600" />
                    </div>
                  ) : bypassSlots.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">
                      No available slots for this machine
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto mb-4">
                      {bypassSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setBypassSelectedSlot(slot)}
                          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                            bypassSelectedSlot?.id === slot.id
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setBypassModal(false);
                    setBypassSlots([]);
                    setBypassSelectedSlot(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBypassQueue}
                  disabled={
                    !bypassUserId ||
                    !bypassResourceId ||
                    !bypassSelectedSlot ||
                    actionLoading === "bypass"
                  }
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "bypass" ? "Assigning..." : "Assign Slot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Machine Modal ──────────────────── */}
      {addMachineModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Add Machine
                </h3>
                <button
                  onClick={() => setAddMachineModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Add a new laundry machine to this hostel.
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Machine Name
              </label>
              <input
                type="text"
                value={newMachineName}
                onChange={(e) => setNewMachineName(e.target.value)}
                placeholder="e.g., Washing Machine 5"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAddMachineModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMachine}
                  disabled={
                    !newMachineName.trim() || actionLoading === "add-machine"
                  }
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "add-machine"
                    ? "Adding..."
                    : "Add Machine"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Operations Tab ──────────────────────────────
const OperationsTab = ({
  machines,
  activeBookings,
  waitlist,
  availableCount,
  inUseCount,
  maintenanceCount,
  actionLoading,
  onForceRelease,
  onSetMaintenance,
  onClearMaintenance,
  onOpenBypassModal,
}: {
  machines: Resource[];
  activeBookings: ActiveBooking[];
  waitlist: WaitlistEntry[];
  availableCount: number;
  inUseCount: number;
  maintenanceCount: number;
  actionLoading: string | null;
  onForceRelease: (id: string) => void;
  onSetMaintenance: (m: Resource) => void;
  onClearMaintenance: (id: string) => void;
  onOpenBypassModal: () => void;
}) => (
  <div className="space-y-6">
    {/* Stats Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Machines"
        value={machines.length}
        icon={<WashingMachine className="w-5 h-5" />}
        color="slate"
      />
      <StatCard
        label="Available"
        value={availableCount}
        icon={<CheckCircle className="w-5 h-5" />}
        color="emerald"
      />
      <StatCard
        label="In Use"
        value={inUseCount}
        icon={<Clock className="w-5 h-5" />}
        color="amber"
      />
      <StatCard
        label="Maintenance"
        value={maintenanceCount}
        icon={<Wrench className="w-5 h-5" />}
        color="red"
      />
    </div>

    {/* Machine Grid */}
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800">Machine Status</h2>
        <div className="flex gap-3 text-xs">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className="text-slate-500">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
      {machines.length === 0 ? (
        <div className="text-center py-10">
          <WashingMachine className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">
            No machines found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            No laundry resources are configured for your hostel yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {machines.map((machine) => {
            const cfg = STATUS_CONFIG[machine.liveStatus];
            if (!cfg) return null;
            return (
              <div
                key={machine.id}
                className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 relative group transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xl font-bold ${cfg.text}`}>
                    {machine.name.match(/\d+/)?.[0] || "#"}
                  </span>
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                </div>
                <p className={`text-xs font-medium ${cfg.text} truncate`}>
                  {cfg.label}
                </p>
                {machine.liveStatus === "IN_USE" && machine.currentUser && (
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    {machine.currentUser}
                  </p>
                )}
                {machine.liveStatus === "MAINTENANCE" &&
                  machine.maintenance && (
                    <p className="text-[10px] text-red-500 mt-1 truncate">
                      {machine.maintenance}
                    </p>
                  )}
                {/* Machine actions */}
                <div className="absolute inset-0 bg-white/90 rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {machine.liveStatus === "MAINTENANCE" ? (
                    <button
                      onClick={() => onClearMaintenance(machine.id)}
                      disabled={actionLoading === machine.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === machine.id ? "..." : "Clear"}
                    </button>
                  ) : (
                    <button
                      onClick={() => onSetMaintenance(machine)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Maintenance
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Active Bookings + Waitlist */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Active Bookings */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">
            Active Bookings
          </h2>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
            {activeBookings.length} active
          </span>
        </div>
        {activeBookings.length === 0 ? (
          <div className="text-center py-8">
            <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              No active bookings right now
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activeBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">
                      {booking.userName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {booking.userName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.machineName} · {fmtTime(booking.startTime)} –{" "}
                      {fmtTime(booking.endTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      booking.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {booking.status}
                  </span>
                  <button
                    onClick={() => onForceRelease(booking.id)}
                    disabled={actionLoading === booking.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3" />
                    {actionLoading === booking.id ? "..." : "Force Release"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waitlist */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Waitlist</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
              {waitlist.length} waiting
            </span>
            <button
              onClick={onOpenBypassModal}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              Bypass
            </button>
          </div>
        </div>
        {waitlist.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No one waiting</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {waitlist.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100"
              >
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-purple-600">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {entry.userName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Joined {timeAgo(entry.joinedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Analytics Tab ───────────────────────────────
const AnalyticsTab = ({
  flakeData,
  heatmap: _heatmap,
  turnaround,
  heatmapMax,
  getHeatmapCount,
  getHeatmapColor,
}: {
  flakeData: FlakeData | null;
  heatmap: HeatmapCell[];
  turnaround: WaitlistTurnaround | null;
  heatmapMax: number;
  getHeatmapCount: (day: number, hour: number) => number;
  getHeatmapColor: (count: number, max: number) => string;
}) => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Flake Rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              No-Show / Flake Rate
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {flakeData?.flakeRate ?? 0}%
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {flakeData?.cancelled ?? 0} cancelled out of {flakeData?.total ?? 0}{" "}
          total bookings
        </p>
        {flakeData && flakeData.total > 0 && (
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Completed", value: flakeData.completed },
                    { name: "Cancelled", value: flakeData.cancelled },
                    { name: "Confirmed", value: flakeData.confirmed },
                    { name: "Active", value: flakeData.active },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {[
                    { name: "Completed", value: flakeData.completed },
                    { name: "Cancelled", value: flakeData.cancelled },
                    { name: "Confirmed", value: flakeData.confirmed },
                    { name: "Active", value: flakeData.active },
                  ]
                    .filter((d) => d.value > 0)
                    .map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}`, "Bookings"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Waitlist Turnaround */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <CalendarClock className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              Avg Waitlist Turnaround
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {turnaround?.avg_wait_minutes ?? 0} min
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Based on {turnaround?.total_fulfilled ?? 0} fulfilled waitlist entries
        </p>
        <div className="mt-6 flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
          <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="text-xs text-indigo-700">
            {turnaround && Number(turnaround.avg_wait_minutes) <= 30
              ? "Great! Students wait less than 30 minutes on average."
              : turnaround && Number(turnaround.avg_wait_minutes) <= 60
                ? "Average wait is moderate. Consider adding more machines."
                : "Wait times are high. Students are waiting over an hour."}
          </p>
        </div>
      </div>

      {/* Quick Totals */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">
              All-Time Bookings
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {flakeData?.total ?? 0}
            </p>
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
            </span>
            <span className="font-semibold text-slate-700">
              {flakeData?.completed ?? 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Cancelled
            </span>
            <span className="font-semibold text-slate-700">
              {flakeData?.cancelled ?? 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Confirmed
            </span>
            <span className="font-semibold text-slate-700">
              {flakeData?.confirmed ?? 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> Active
            </span>
            <span className="font-semibold text-slate-700">
              {flakeData?.active ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Peak Load Heatmap */}
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-800">
          Peak Load Heatmap
        </h2>
        <span className="text-xs text-slate-400">
          Booking density by day & hour
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-xs text-slate-400 font-medium p-1 text-left w-10" />
              {HOUR_LABELS.map((h) => (
                <th
                  key={h}
                  className="text-[10px] text-slate-400 font-medium p-1 text-center"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((day, dayIdx) => (
              <tr key={day}>
                <td className="text-xs text-slate-500 font-medium p-1 pr-2">
                  {day}
                </td>
                {Array.from({ length: 16 }, (_, hourOffset) => {
                  const hour = hourOffset + 7;
                  const count = getHeatmapCount(dayIdx, hour);
                  return (
                    <td key={hour} className="p-0.5">
                      <div
                        className={`w-full aspect-square rounded-sm flex items-center justify-center text-[9px] font-medium transition-colors ${getHeatmapColor(count, heatmapMax)}`}
                        title={`${day} ${hour}:00 – ${count} bookings`}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span>Less</span>
        <div className="w-4 h-4 rounded-sm bg-slate-50 border border-slate-200" />
        <div className="w-4 h-4 rounded-sm bg-blue-100" />
        <div className="w-4 h-4 rounded-sm bg-blue-300" />
        <div className="w-4 h-4 rounded-sm bg-blue-500" />
        <div className="w-4 h-4 rounded-sm bg-blue-700" />
        <span>More</span>
      </div>
    </div>
  </div>
);

// ─── Stat Card ───────────────────────────────────
const STAT_COLORS: Record<string, { bg: string; text: string }> = {
  slate: { bg: "bg-slate-50", text: "text-slate-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-500" },
  red: { bg: "bg-red-50", text: "text-red-500" },
};

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
  const colors = STAT_COLORS[color] || STAT_COLORS.slate;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
      <div className={`p-2.5 ${colors.bg} rounded-xl`}>
        <div className={colors.text}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
};

export default LaundryManagement;
