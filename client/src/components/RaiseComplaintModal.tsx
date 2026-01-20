import { useState, useEffect } from "react";
import { Upload, Building, MapPin, FileText } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../store/slices/authSlice";
import {
  getComplaintCategories,
  createComplaint,
  uploadComplaintAttachment,
  type ComplaintCategory,
} from "../services/complaint.service";
import FormModal from "./common/FormModal";
import { X } from "lucide-react";

interface RaiseComplaintModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const RaiseComplaintModal = ({
  onClose,
  onSuccess,
}: RaiseComplaintModalProps) => {
  const user = useSelector(selectCurrentUser);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getComplaintCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.roomId) {
      alert("Room ID not found for user. Please contact admin.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Complaint
      const complaint = await createComplaint(
        title,
        description,
        categoryId,
        user.roomId,
      );

      // 2. Upload Attachment if exists
      if (file && complaint.id) {
        await uploadComplaintAttachment(complaint.id, file);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to raise complaint", error);
      alert("Failed to raise complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // User Info Header Content
  const userInfoContent = (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
          Block
        </label>
        <div className="flex items-center text-slate-700 font-medium">
          <Building className="w-4 h-4 mr-2 text-indigo-500" />
          {user?.blockName || "N/A"}
        </div>
      </div>
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
          Room Number
        </label>
        <div className="flex items-center text-slate-700 font-medium">
          <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
          {user?.roomNumber || "N/A"}
        </div>
      </div>
    </div>
  );

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Raise Complaint"
      icon={FileText}
      isSubmitting={isSubmitting}
      submitButtonText="Raise Complaint"
      headerContent={userInfoContent}
    >
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Title
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          placeholder="Brief summary of the issue"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Category
        </label>
        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isLoadingCategories}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
          placeholder="Detailed description of the problem..."
        />
      </div>

      {/* Attachment */}
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
    </FormModal>
  );
};

export default RaiseComplaintModal;
