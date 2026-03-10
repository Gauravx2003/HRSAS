import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

interface TicketData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  category: string;
  room: string;
  block: string;
  hostel: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const priorityColor: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function VendorTicketView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{
    type: "accepted" | "rejected" | "resolved";
  } | null>(null);

  // Fetch ticket on load
  useEffect(() => {
    const fetchTicket = async () => {
      if (!token) {
        setError(
          "Missing secure token. Please use the exact link sent to your phone.",
        );
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(
          `${API_URL}/staff/complaints/${id}/vendor-view?token=${token}`,
        );
        setTicket(res.data);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "Failed to load ticket. The link may have expired.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id, token]);

  const updateTicket = async (
    newStatus: "IN_PROGRESS" | "RESOLVED" | "REJECTED",
  ) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API_URL}/staff/complaints/${id}/vendor-update`, {
        token,
        newStatus,
      });

      if (newStatus === "REJECTED") {
        setDone({ type: "rejected" });
      } else if (newStatus === "IN_PROGRESS") {
        setDone({ type: "accepted" });
        setTicket((prev) => (prev ? { ...prev, status: "IN_PROGRESS" } : prev));
      } else if (newStatus === "RESOLVED") {
        setDone({ type: "resolved" });
        setTicket((prev) => (prev ? { ...prev, status: "RESOLVED" } : prev));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ─── Loading State ────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600" />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────
  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Link Error</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-600 to-indigo-700">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">Habitat</h1>
            <p className="text-indigo-200 text-xs">Maintenance Task</p>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-slate-50 rounded-t-3xl min-h-[calc(100vh-120px)] px-5 pt-6 pb-8">
        {/* Error Toast */}
        {error && ticket && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ─── Done States ───────────────────────── */}
        {done?.type === "rejected" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-10 h-10 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Task Declined
            </h2>
            <p className="text-sm text-slate-500 max-w-65 mx-auto">
              This task will be reassigned to another technician. You can close
              this page.
            </p>
          </div>
        )}

        {done?.type === "resolved" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Task Complete!
            </h2>
            <p className="text-sm text-slate-500 max-w-65 mx-auto">
              Great work! The resident will be notified. You can close this
              page.
            </p>
          </div>
        )}

        {done?.type === "accepted" && (
          <div className="space-y-3">
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-2">
              <p className="text-sm text-emerald-700 font-medium">
                ✅ Task accepted! Update status when done.
              </p>
            </div>
            <button
              onClick={() => updateTicket("RESOLVED")}
              disabled={actionLoading}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {actionLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                "🎉  Mark as Resolved"
              )}
            </button>
          </div>
        )}

        {/* ─── Active States ────────────────────── */}
        {!done && (
          <>
            {/* Ticket Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${priorityColor[ticket.priority] || "bg-slate-100 text-slate-600"}`}
                >
                  {ticket.priority}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  #{ticket.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-800 mb-1.5">
                {ticket.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {ticket.description}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <InfoPill label="Category" value={ticket.category} />
                <InfoPill label="Priority" value={ticket.priority} />
                <InfoPill
                  label="Location"
                  value={`${ticket.hostel}, Block ${ticket.block}, Room ${ticket.room}`}
                />
                <InfoPill label="Raised" value={fmtDate(ticket.createdAt)} />
              </div>
            </div>

            {/* Current Status */}
            <div className="flex items-center gap-2 mb-5 px-1">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  ticket.status === "ASSIGNED"
                    ? "bg-amber-400"
                    : ticket.status === "IN_PROGRESS"
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                }`}
              />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status: {ticket.status.replace("_", " ")}
              </span>
            </div>

            {/* ─── Step 1: Accept / Reject (ASSIGNED) ─── */}
            {ticket.status === "ASSIGNED" && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 text-center mb-1">
                  Do you want to take this task?
                </p>
                <button
                  onClick={() => updateTicket("IN_PROGRESS")}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    "✅  Accept Task"
                  )}
                </button>
                <button
                  onClick={() => updateTicket("REJECTED")}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actionLoading ? "Processing…" : "✕  Decline Task"}
                </button>
              </div>
            )}

            {/* ─── Step 2: Mark Resolved (IN_PROGRESS) ─── */}
            {ticket.status === "IN_PROGRESS" && !done && (
              <div className="space-y-3">
                <button
                  onClick={() => updateTicket("RESOLVED")}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    "🎉  Mark as Resolved"
                  )}
                </button>
              </div>
            )}

            {/* ─── Already Resolved/Closed ─── */}
            {ticket.status === "RESOLVED" && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
                  This task has already been resolved.
                </p>
              </div>
            )}

            {ticket.status === "CREATED" && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">
                  This task is no longer assigned to you.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Small Info Pill ───────────────────────────────
const InfoPill = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-50 rounded-lg px-3 py-2">
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <p className="text-xs font-medium text-slate-700 leading-snug">{value}</p>
  </div>
);
