import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Package,
  Search,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from "lucide-react";
import AddFoundItemModal from "../../components/AddFoundItemModal";

interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  type: "LOST" | "FOUND";
  status: "OPEN" | "CLAIMED" | "CLOSED";
  lostDate: string | null;
  lostLocation: string | null;
  foundDate: string | null;
  foundLocation: string | null;
  reportedByName: string;
  claimedByName: string | null;
  createdAt: string;
}

const LostFoundApprovals = () => {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "LOST" | "FOUND">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/lost-and-found/all");
      setItems(response.data);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseItem = async (id: string) => {
    try {
      await api.patch(`/lost-and-found/${id}/close`);
      fetchItems();
    } catch (error) {
      console.error("Failed to close item:", error);
    }
  };

  const handleReopenItem = async (id: string) => {
    try {
      await api.patch(`/lost-and-found/${id}/open`);
      fetchItems();
    } catch (error) {
      console.error("Failed to reopen item:", error);
    }
  };

  const handleMarkAsFound = async (id: string) => {
    const foundDate = new Date().toISOString();
    const foundLocation = prompt("Enter found location:");

    if (!foundLocation) return;

    try {
      await api.patch(`/lost-and-found/${id}/update`, {
        foundDate,
        foundLocation,
      });
      fetchItems();
    } catch (error) {
      console.error("Failed to mark as found:", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filter === "ALL") return true;
    return item.type === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      OPEN: "bg-green-100 text-green-700",
      CLAIMED: "bg-yellow-100 text-yellow-700",
      CLOSED: "bg-slate-100 text-slate-700",
    };
    return styles[status as keyof typeof styles] || styles.OPEN;
  };

  const getTypeBadge = (type: string) => {
    return type === "LOST"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Lost & Found Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all lost and found items across the hostel
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Found Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setFilter("FOUND")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "FOUND"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Found Items
        </button>
        <button
          onClick={() => setFilter("LOST")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "LOST"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Lost Items
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No items found</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">{item.title}</h3>
                </div>
                <div className="flex gap-1">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadge(
                      item.type,
                    )}`}
                  >
                    {item.type}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {item.description}
              </p>

              {/* Details for FOUND items */}
              {item.type === "FOUND" && (
                <div className="space-y-2 mb-4">
                  {item.foundDate && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        Found: {new Date(item.foundDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {item.foundLocation && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{item.foundLocation}</span>
                    </div>
                  )}
                  {item.claimedByName && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Claimed by: {item.claimedByName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Details for LOST items */}
              {item.type === "LOST" && (
                <div className="space-y-2 mb-4">
                  {item.lostDate && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        Lost: {new Date(item.lostDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {item.lostLocation && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{item.lostLocation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Reported by: {item.reportedByName}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {/* For FOUND items with CLAIMED status */}
                {item.type === "FOUND" && item.status === "CLAIMED" && (
                  <>
                    <button
                      onClick={() => handleCloseItem(item.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Claim
                    </button>
                    <button
                      onClick={() => handleReopenItem(item.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Claim
                    </button>
                  </>
                )}

                {/* For LOST items */}
                {item.type === "LOST" && item.status !== "CLOSED" && (
                  <button
                    onClick={() => handleMarkAsFound(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Found
                  </button>
                )}

                {/* For OPEN or CLOSED items - show status */}
                {item.status === "OPEN" && item.type === "FOUND" && (
                  <div className="flex-1 flex items-center justify-center gap-1 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    Awaiting claim
                  </div>
                )}

                {item.status === "CLOSED" && (
                  <div className="flex-1 flex items-center justify-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Resolved
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Found Item Modal */}
      {isModalOpen && (
        <AddFoundItemModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchItems}
          type="found"
        />
      )}
    </div>
  );
};

export default LostFoundApprovals;
