import { useState } from "react";
import api from "../services/api";
import { X, Calendar, MapPin, User, Mail } from "lucide-react";

interface AddFoundItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
  type: "found" | "lost";
}

const AddFoundItemModal = ({
  onClose,
  onSuccess,
  type,
}: AddFoundItemModalProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reporterType: "myself", // "myself" or "other"
    reportedByEmail: "",
    foundDate: "",
    foundLocation: "",
    lostDate: "",
    lostLocation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleReporterTypeChange = (type: "myself" | "other") => {
    setFormData({
      ...formData,
      reporterType: type,
      reportedByEmail: type === "myself" ? "" : formData.reportedByEmail,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!formData.foundDate) {
      setError("Found date is required");
      return;
    }
    if (!formData.foundLocation.trim()) {
      setError("Found location is required");
      return;
    }
    if (formData.reporterType === "other" && !formData.reportedByEmail.trim()) {
      setError("Reporter email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/lost-and-found/create", {
        title: formData.title,
        description: formData.description,
        foundDate: formData.foundDate,
        foundLocation: formData.foundLocation,
        lostDate: formData.lostDate,
        lostLocation: formData.lostLocation,
        reportedByEmail:
          formData.reporterType === "other" ? formData.reportedByEmail : null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating found item:", err);
      setError(
        err.response?.data?.error ||
          "Failed to create found item. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          {type === "found" ? (
            <h2 className="text-xl font-bold text-slate-800">Add Found Item</h2>
          ) : (
            <h2 className="text-xl font-bold text-slate-800">Add Lost Item</h2>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Item Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Blue Water Bottle"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details about the item..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Found Date */}
          {type === "found" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Found Date *
              </label>
              <input
                type="date"
                name="foundDate"
                value={formData.foundDate}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          )}

          {/* Found Location */}
          {type === "found" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Found Location *
              </label>
              <input
                type="text"
                name="foundLocation"
                value={formData.foundLocation}
                onChange={handleChange}
                placeholder="e.g., Library, Room 101, Cafeteria"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          )}

          {/* Lost Date */}
          {type === "lost" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Lost Date *
              </label>
              <input
                type="date"
                name="foundDate"
                value={formData.foundDate}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          )}

          {/* Lost Location */}
          {type === "lost" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Lost Location *
              </label>
              <input
                type="text"
                name="lostLocation"
                value={formData.lostLocation}
                onChange={handleChange}
                placeholder="e.g., Library, Room 101, Cafeteria"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          )}

          {/* Reporter Type */}
          {type === "found" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <User className="w-4 h-4 inline mr-1" />
                Who found this item? *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="reporterType"
                    value="myself"
                    checked={formData.reporterType === "myself"}
                    onChange={() => handleReporterTypeChange("myself")}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Myself</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="reporterType"
                    value="other"
                    checked={formData.reporterType === "other"}
                    onChange={() => handleReporterTypeChange("other")}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">
                    Someone Else
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Reporter Email (conditional) */}
          {formData.reporterType === "other" && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Reporter's Email *
              </label>
              <input
                type="email"
                name="reportedByEmail"
                value={formData.reportedByEmail}
                onChange={handleChange}
                placeholder="reporter@example.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-2">
                Enter the email of the person who found this item
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {type === "found" ? (
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Found Item"}
              </button>
            ) : (
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Lost Item"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFoundItemModal;
