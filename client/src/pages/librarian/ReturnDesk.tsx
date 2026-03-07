import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Search,
  User,
  Undo2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  X,
} from "lucide-react";

interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomNumber: string | null;
}

interface BorrowedBook {
  transactionId: string;
  copyId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  bookTitle: string;
  bookAuthor: string;
  bookIsbn: string | null;
  bookId: string;
  isOverdue: boolean;
  daysOverdue: number;
}

const ReturnDesk = () => {
  const [residentQuery, setResidentQuery] = useState("");
  const [residentResults, setResidentResults] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null,
  );
  const [searchingResident, setSearchingResident] = useState(false);

  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Return modal
  const [returnModal, setReturnModal] = useState<BorrowedBook | null>(null);
  const [condition, setCondition] = useState<"GOOD" | "DAMAGED" | "LOST">(
    "GOOD",
  );
  const [payFineNow, setPayFineNow] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  // Debounced resident search
  useEffect(() => {
    if (residentQuery.trim().length < 2) {
      setResidentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingResident(true);
        const res = await api.get(
          `/library/search-residents?q=${encodeURIComponent(residentQuery)}`,
        );
        setResidentResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingResident(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [residentQuery]);

  const selectResident = async (resident: Resident) => {
    setSelectedResident(resident);
    setResidentQuery("");
    setResidentResults([]);
    setReturnSuccess(null);

    try {
      setLoadingBooks(true);
      const res = await api.get(`/library/borrowed/${resident.id}`);
      setBorrowedBooks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    try {
      setReturning(true);
      const res = await api.post("/library/return-desk", {
        transactionId: returnModal.transactionId,
        condition,
        payFineNow,
      });
      setReturnSuccess(
        `"${returnModal.bookTitle}" returned. ${
          res.data.fineAmount > 0
            ? `Fine: ₹${res.data.fineAmount}${payFineNow ? " (Paid)" : " (Pending)"}`
            : "No fine."
        }`,
      );
      setReturnModal(null);
      setCondition("GOOD");
      setPayFineNow(false);

      // Refresh borrowed books
      if (selectedResident) {
        const r = await api.get(`/library/borrowed/${selectedResident.id}`);
        setBorrowedBooks(r.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to return book");
    } finally {
      setReturning(false);
    }
  };

  const resetAll = () => {
    setSelectedResident(null);
    setBorrowedBooks([]);
    setResidentQuery("");
    setReturnSuccess(null);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Return Desk
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Process book returns and handle fines
        </p>
      </div>

      {/* Success Banner */}
      {returnSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">
            {returnSuccess}
          </p>
        </div>
      )}

      {/* Find Resident */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-indigo-100 text-indigo-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
            1
          </div>
          <h2 className="text-base font-bold text-slate-800">Find Resident</h2>
        </div>

        {!selectedResident ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={residentQuery}
              onChange={(e) => setResidentQuery(e.target.value)}
              placeholder="Search by name, email, or room number..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchingResident && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}

            {residentResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {residentResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectResident(r)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {r.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.email}
                      {r.roomNumber && ` • Room ${r.roomNumber}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedResident.name}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedResident.email}
                  {selectedResident.roomNumber &&
                    ` • Room ${selectedResident.roomNumber}`}
                </p>
              </div>
            </div>
            <button
              onClick={resetAll}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Borrowed Books Table */}
      {selectedResident && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-100 text-indigo-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h2 className="text-base font-bold text-slate-800">
              Currently Borrowed
            </h2>
            <span className="text-xs text-slate-500 ml-1">
              ({borrowedBooks.length}{" "}
              {borrowedBooks.length === 1 ? "book" : "books"})
            </span>
          </div>

          {loadingBooks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : borrowedBooks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No books currently borrowed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Copy ID
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Issued
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Due
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {borrowedBooks.map((b) => (
                    <tr
                      key={b.transactionId}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800">
                          {b.bookTitle}
                        </p>
                        <p className="text-xs text-slate-500">{b.bookAuthor}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs text-slate-600">
                          {b.copyId.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {fmtDate(b.issueDate)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {fmtDate(b.dueDate)}
                      </td>
                      <td className="py-3 px-3">
                        {b.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            {b.daysOverdue}d overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <Clock className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setReturnModal(b);
                            setCondition("GOOD");
                            setPayFineNow(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Return
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Return Modal ──────────────────────────── */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Return Book
                </h3>
                <button
                  onClick={() => setReturnModal(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-800">
                  {returnModal.bookTitle}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Copy: {returnModal.copyId.slice(0, 8).toUpperCase()}
                </p>
              </div>

              {/* Overdue Warning */}
              {returnModal.isOverdue && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    <span className="font-bold">
                      {returnModal.daysOverdue} days
                    </span>{" "}
                    overdue — fine will be calculated
                  </p>
                </div>
              )}

              {/* Condition */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Book Condition
              </label>
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as "GOOD" | "DAMAGED" | "LOST")
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
              >
                <option value="GOOD">Good — Return to shelf</option>
                <option value="DAMAGED">Damaged — Needs maintenance</option>
                <option value="LOST">Lost — Mark as lost</option>
              </select>

              {/* Pay Fine Checkbox */}
              {returnModal.isOverdue && (
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payFineNow}
                    onChange={(e) => setPayFineNow(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">
                    Mark fine as paid now
                  </span>
                </label>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setReturnModal(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturn}
                  disabled={returning}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {returning ? "Processing..." : "Confirm Return"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnDesk;
