import { useEffect, useState } from "react";
import api from "../../services/api";
import { Search, MapPin, Calendar, Package, Clock, Plus } from "lucide-react";
import AttachmentPreview from "../../components/AttachmentPreview";
import AttachmentsUpload from "../../components/AttachmentsUpload";
import AddFoundItemModal from "../../components/AddFoundItemModal";

interface LostItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  description?: string;
  lostDate: string;
  lostLocation: string;
  attachments?: Array<{ id: string; fileURL: string }>;
}

const MyLostItems = () => {
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log(lostItems);

  useEffect(() => {
    fetchLostItems();
  }, []);

  const fetchLostItems = () => {
    setIsLoading(true);
    api
      .get("/lost-and-found/my")
      .then((res) => {
        setLostItems(res.data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: "bg-green-100 text-green-700",
      CLAIMED: "bg-yellow-100 text-yellow-700",
      CLOSED: "bg-slate-100 text-slate-700",
      FOUND: "bg-blue-100 text-blue-700",
    };
    return styles[status] || styles.OPEN;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            My Lost Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track status of items you have reported lost
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Lost Item
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : lostItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No lost items reported</p>
          <p className="text-sm text-slate-500 mt-1">
            You haven't reported any lost items yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {lostItems.map((item) => (
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
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                    LOST
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {item.description || "No description provided"}
              </p>

              {/* Details */}
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
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    Reported: {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Attachments */}
              {item.attachments && item.attachments.length > 0 ? (
                <div className="mb-4">
                  <AttachmentPreview attachments={item.attachments} />
                </div>
              ) : (
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-sm text-slate-600 pb-4">No attachments</p>
                </div>
              )}

              {/* Upload */}
              <div className="pt-3 border-t border-slate-100">
                <AttachmentsUpload
                  uploadUrl={`/lost-and-found/${item.id}/attachments`}
                  onSuccess={fetchLostItems}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Found Item Modal */}
      {isModalOpen && (
        <AddFoundItemModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchLostItems}
          type="lost"
        />
      )}
    </div>
  );
};

export default MyLostItems;
