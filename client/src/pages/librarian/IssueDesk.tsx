import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Search,
  CheckCircle,
  XCircle,
  //BookOpen,
  Send,
  User,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomNumber: string | null;
}

interface Eligibility {
  eligible: boolean;
  reason: string | null;
  currentBorrows?: number;
  maxBooks?: number;
}

interface BookResult {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  totalCopies: number;
  availableCopies: number;
}

interface Copy {
  id: string;
  status: string;
  createdAt: string;
}

const IssueDesk = () => {
  // Step 1: Resident
  const [residentQuery, setResidentQuery] = useState("");
  const [residentResults, setResidentResults] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null,
  );
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [searchingResident, setSearchingResident] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Step 2: Book
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<BookResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [searchingBooks, setSearchingBooks] = useState(false);

  // Step 3: Copy
  const [copies, setCopies] = useState<Copy[]>([]);
  const [selectedCopy, setSelectedCopy] = useState<Copy | null>(null);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);

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

  // Debounced book search
  useEffect(() => {
    if (bookQuery.trim().length < 2) {
      setBookResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingBooks(true);
        const res = await api.get(
          `/library/search-books?q=${encodeURIComponent(bookQuery)}`,
        );
        setBookResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingBooks(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bookQuery]);

  const selectResident = async (resident: Resident) => {
    setSelectedResident(resident);
    setResidentQuery("");
    setResidentResults([]);
    setEligibility(null);
    setSelectedBook(null);
    setSelectedCopy(null);
    setIssueSuccess(false);

    try {
      setCheckingEligibility(true);
      const res = await api.get(`/library/eligibility/${resident.id}`);
      setEligibility(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const selectBook = async (book: BookResult) => {
    setSelectedBook(book);
    setBookQuery("");
    setBookResults([]);
    setSelectedCopy(null);

    try {
      setLoadingCopies(true);
      const res = await api.get(`/library/copies/${book.id}`);
      setCopies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedResident || !selectedCopy) return;
    try {
      setIssuing(true);
      await api.post("/library/issue", {
        userId: selectedResident.id,
        copyId: selectedCopy.id,
      });
      setIssueSuccess(true);
      // Reset for next issue
      setSelectedBook(null);
      setSelectedCopy(null);
      setCopies([]);
      setBookQuery("");
      // Refresh eligibility
      const res = await api.get(`/library/eligibility/${selectedResident.id}`);
      setEligibility(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to issue book");
    } finally {
      setIssuing(false);
    }
  };

  const resetAll = () => {
    setSelectedResident(null);
    setEligibility(null);
    setSelectedBook(null);
    setSelectedCopy(null);
    setCopies([]);
    setResidentQuery("");
    setBookQuery("");
    setIssueSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Issue Desk
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Issue books to residents — Search → Verify → Issue
        </p>
      </div>

      {/* Success Banner */}
      {issueSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Book issued successfully!
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              You can issue another book to this resident or{" "}
              <button onClick={resetAll} className="underline font-medium">
                start fresh
              </button>
              .
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Find Resident */}
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

            {/* Dropdown results */}
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
          /* Resident Status Card */
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

            <div className="flex items-center gap-3">
              {checkingEligibility ? (
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              ) : eligibility ? (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    eligibility.eligible
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {eligibility.eligible ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {eligibility.eligible ? "Eligible" : "Blocked"}
                </div>
              ) : null}
              <button
                onClick={resetAll}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Block reason */}
        {eligibility && !eligibility.eligible && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">
              Cannot issue: {eligibility.reason}
            </p>
          </div>
        )}

        {eligibility &&
          eligibility.eligible &&
          eligibility.currentBorrows !== undefined && (
            <p className="text-xs text-slate-500 mt-2 ml-1">
              Currently holding{" "}
              <span className="font-semibold">
                {eligibility.currentBorrows}/{eligibility.maxBooks}
              </span>{" "}
              books
            </p>
          )}
      </div>

      {/* Step 2: Find Book (only if eligible) */}
      {eligibility?.eligible && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-100 text-indigo-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h2 className="text-base font-bold text-slate-800">Find Book</h2>
          </div>

          {!selectedBook ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                placeholder="Search by title, author, or ISBN..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchingBooks && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}

              {bookResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {bookResults.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => selectBook(b)}
                      disabled={b.availableCopies === 0}
                      className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${
                        b.availableCopies === 0
                          ? "opacity-50 cursor-not-allowed bg-slate-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {b.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {b.author}
                            {b.isbn && ` • ISBN: ${b.isbn}`}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            b.availableCopies > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {b.availableCopies}/{b.totalCopies}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedBook.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedBook.author} • {selectedBook.category}
                    {selectedBook.isbn && ` • ISBN: ${selectedBook.isbn}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setSelectedCopy(null);
                    setCopies([]);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Select Copy */}
      {selectedBook && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-100 text-indigo-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <h2 className="text-base font-bold text-slate-800">
              Select Physical Copy
            </h2>
          </div>

          {loadingCopies ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : copies.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No available copies for this title
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
                {copies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCopy(c)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedCopy?.id === c.id
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">
                      {c.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Added {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleIssue}
                disabled={!selectedCopy || issuing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
              >
                {issuing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {issuing ? "Issuing..." : "Issue Book"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default IssueDesk;
