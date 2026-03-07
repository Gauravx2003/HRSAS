import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Search,
  Plus,
  ChevronLeft,
  Library,
  Trash2,
  BookOpen,
  Loader2,
  X,
  User,
  //AlertTriangle,
} from "lucide-react";

interface BookTitle {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  coverUrl: string | null;
  totalCopies: number;
  availableCopies: number;
}

interface BookCopy {
  id: string;
  status: string;
  createdAt: string;
  currentBorrower: string | null;
  currentBorrowerRoom: string | null;
  transactionStatus: string | null;
}

const Inventory = () => {
  const [titles, setTitles] = useState<BookTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Detail view (Level 2)
  const [selectedTitle, setSelectedTitle] = useState<BookTitle | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  // Add Title Modal
  const [showAddTitle, setShowAddTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newIsbn, setNewIsbn] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [addingTitle, setAddingTitle] = useState(false);

  // Add Copies Modal
  const [showAddCopies, setShowAddCopies] = useState(false);
  const [copyCount, setCopyCount] = useState(1);
  const [addingCopies, setAddingCopies] = useState(false);

  const [discardingId, setDiscardingId] = useState<string | null>(null);

  // ─── Fetch ─────────────────────────────────
  const fetchTitles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/library/titles");
      setTitles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCopies = async (bookId: string) => {
    try {
      setLoadingCopies(true);
      const res = await api.get(`/library/titles/${bookId}/copies`);
      setCopies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCopies(false);
    }
  };

  useEffect(() => {
    fetchTitles();
  }, []);

  // ─── Handlers ──────────────────────────────
  const handleAddTitle = async () => {
    if (!newTitle.trim() || !newAuthor.trim()) return;
    try {
      setAddingTitle(true);
      await api.post("/library/titles", {
        title: newTitle.trim(),
        author: newAuthor.trim(),
        isbn: newIsbn.trim() || undefined,
        category: newCategory,
      });
      setShowAddTitle(false);
      setNewTitle("");
      setNewAuthor("");
      setNewIsbn("");
      setNewCategory("General");
      fetchTitles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add title");
    } finally {
      setAddingTitle(false);
    }
  };

  const handleAddCopies = async () => {
    if (!selectedTitle || copyCount < 1) return;
    try {
      setAddingCopies(true);
      await api.post(`/library/titles/${selectedTitle.id}/copies`, {
        count: copyCount,
      });
      setShowAddCopies(false);
      setCopyCount(1);
      fetchCopies(selectedTitle.id);
      fetchTitles(); // refresh counts
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add copies");
    } finally {
      setAddingCopies(false);
    }
  };

  const handleDiscard = async (copyId: string) => {
    if (!confirm("Discard this copy? This action cannot be undone.")) return;
    try {
      setDiscardingId(copyId);
      await api.patch(`/library/copies/${copyId}/discard`);
      if (selectedTitle) fetchCopies(selectedTitle.id);
      fetchTitles();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to discard copy");
    } finally {
      setDiscardingId(null);
    }
  };

  const openCopiesView = (title: BookTitle) => {
    setSelectedTitle(title);
    fetchCopies(title.id);
  };

  // ─── Filter ────────────────────────────────
  const filteredTitles = titles.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.isbn && t.isbn.includes(searchQuery)),
  );

  const getStatusBadge = (copy: BookCopy) => {
    if (
      copy.transactionStatus === "BORROWED" ||
      copy.transactionStatus === "OVERDUE"
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
          Borrowed
        </span>
      );
    }
    const statusMap: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      ACTIVE: {
        bg: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
        label: "Available",
      },
      MAINTENANCE: {
        bg: "bg-orange-50 border-orange-200",
        text: "text-orange-700",
        label: "Maintenance",
      },
      ARCHIVED: {
        bg: "bg-slate-50 border-slate-200",
        text: "text-slate-700",
        label: "Archived",
      },
      LOST_FOREVER: {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
        label: "Lost",
      },
    };
    const cfg = statusMap[copy.status] || statusMap.ACTIVE;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} text-xs font-bold border`}
      >
        {cfg.label}
      </span>
    );
  };

  // ─── Level 2: Copies View ──────────────────
  if (selectedTitle) {
    return (
      <div className="space-y-6">
        {/* Back button + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedTitle(null);
              setCopies([]);
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {selectedTitle.title}
            </h1>
            <p className="text-sm text-slate-500">
              {selectedTitle.author}
              {selectedTitle.isbn && ` • ISBN: ${selectedTitle.isbn}`} •{" "}
              {selectedTitle.category}
            </p>
          </div>
          <button
            onClick={() => setShowAddCopies(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Copies
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{copies.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Copies</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {
                copies.filter(
                  (c) => c.status === "ACTIVE" && !c.transactionStatus,
                ).length
              }
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Available</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {
                copies.filter(
                  (c) =>
                    c.transactionStatus === "BORROWED" ||
                    c.transactionStatus === "OVERDUE",
                ).length
              }
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Borrowed</p>
          </div>
        </div>

        {/* Copies Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {loadingCopies ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : copies.length === 0 ? (
            <div className="text-center py-8">
              <Library className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No physical copies added yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Copy ID
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Current Borrower
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {copies.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {c.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(c)}</td>
                      <td className="py-3 px-3">
                        {c.currentBorrower ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700">
                              {c.currentBorrower}
                            </span>
                            {c.currentBorrowerRoom && (
                              <span className="text-slate-400 text-xs">
                                • Room {c.currentBorrowerRoom}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {c.status !== "LOST_FOREVER" &&
                          !c.transactionStatus && (
                            <button
                              onClick={() => handleDiscard(c.id)}
                              disabled={discardingId === c.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Discard copy"
                            >
                              {discardingId === c.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Add Copies Modal ─────────────────── */}
        {showAddCopies && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">
                    Add Copies
                  </h3>
                  <button
                    onClick={() => setShowAddCopies(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Add physical copies of{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedTitle.title}
                  </span>
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of Copies
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={copyCount}
                  onChange={(e) =>
                    setCopyCount(
                      Math.max(1, Math.min(50, Number(e.target.value))),
                    )
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddCopies(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCopies}
                    disabled={addingCopies}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {addingCopies ? "Adding..." : `Add ${copyCount} Copies`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Level 1: Catalog View ─────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Inventory Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage book catalog and physical copies
          </p>
        </div>
        <button
          onClick={() => setShowAddTitle(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add New Title
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by title, author, or ISBN..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Titles Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : filteredTitles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">
              {searchQuery
                ? "No titles match your search"
                : "No titles in catalog"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddTitle(true)}
                className="mt-3 text-sm text-indigo-600 font-medium hover:underline"
              >
                Add your first book title
              </button>
            )}
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
                    Author
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ISBN
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Available
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTitles.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openCopiesView(t)}
                    className="border-b border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {t.title}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{t.author}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs text-slate-500">
                        {t.isbn || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {t.totalCopies}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          t.availableCopies === 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {t.availableCopies}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Title Modal ────────────────────── */}
      {showAddTitle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Add New Title
                </h3>
                <button
                  onClick={() => setShowAddTitle(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Introduction to Algorithms"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Author *
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g., Thomas H. Cormen"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    placeholder="e.g., 978-0262033848"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="General">General</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science">Science</option>
                    <option value="Technology">Technology</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Literature">Literature</option>
                    <option value="History">History</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddTitle(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTitle}
                  disabled={
                    !newTitle.trim() || !newAuthor.trim() || addingTitle
                  }
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addingTitle ? "Adding..." : "Add Title"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
