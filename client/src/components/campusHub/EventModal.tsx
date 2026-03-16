import React, { useState, useEffect } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import api from "../../services/api";
import AttachmentsUpload from "../AttachmentsUpload";
import { Upload } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: any; // If provided, it's edit mode
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  event,
}) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "Common Hall",
    category: "CULTURAL",
  });
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        startDate: event.startDate ? event.startDate.slice(0, 16) : "",
        endDate: event.endDate ? event.endDate.slice(0, 16) : "",
        location: event.location || "Common Hall",
        category: event.category || "CULTURAL",
      });
      setCreatedEventId(event.id);
    } else {
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        location: "Common Hall",
        category: "CULTURAL",
      });
      setCreatedEventId(null);
    }
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 🚨 FIX: Change to setLoading
    setLoading(true);

    try {
      let response;
      if (event) {
        response = await api.patch(`/campus-hub/event/${event.id}`, formData);
        setCreatedEventId(event.id); // Ensure we have the ID (though we already do)
      } else {
        response = await api.post("/campus-hub/event", formData);
        setCreatedEventId(response.data.id);
      }

      if (file && response.data.id) {
        const formData = new FormData();
        formData.append("images", file);
        await api.post(
          `/campus-hub/${response.data.id}/attachments`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );
      }

      if (event) {
        onSuccess(); // Refresh parent
        // Don't close yet if they want to upload? Or maybe close.
        // Let's close for now to be simple, unless we want to force image.
        onClose();
      }
    } catch (error) {
      console.error("Failed to save event", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {event ? "Edit Event" : "Create New Event"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* If event created/editing, show upload section */}
          {createdEventId || event ? (
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                Event Banner Image
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Upload an image to be displayed on the event card.
              </p>
              <AttachmentsUpload
                uploadUrl={`/campus-hub/${createdEventId || event.id}/attachments`}
                onSuccess={() => {
                  // Maybe show a success tick?
                }}
              />
            </div>
          ) : null}

          {/* Form is disabled if we just created successfully to avoid confusion, or we can keep it editable */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="e.g., Diwali Celebration"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="CULTURAL">Cultural</option>
                <option value="SPORTS">Sports</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="MEETUP">Meetup</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="e.g., Common Hall"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                placeholder="Describe the event..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Attachment (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  {file ? (
                    <span className="text-sm font-medium text-indigo-600 truncate">
                      {file.name}
                    </span>
                  ) : (
                    <div className="flex items-center text-sm text-slate-500 group-hover:text-slate-600">
                      <Upload className="w-4 h-4 mr-2" />
                      <span>Click to upload file</span>
                    </div>
                  )}
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {createdEventId && !event ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Finish & Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {event ? "Save Changes" : "Create Event"}
                  </button>
                </>
              )}
            </div>
          </form>

          {/* <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Attachment (Optional)
        </label>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx"
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer group"
          >
            {file ? (
              <span className="text-sm font-medium text-indigo-600 truncate">
                {file.name}
              </span>
            ) : (
              <div className="flex items-center text-sm text-slate-500 group-hover:text-slate-600">
                <Upload className="w-4 h-4 mr-2" />
                <span>Click to upload file</span>
              </div>
            )}
          </label>
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div> */}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
