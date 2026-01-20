import { useState, useEffect } from "react";
import { X, Loader2, UserCog } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../store/slices/authSlice";
import { createStaff } from "../services/userCreation.service";
import {
  getComplaintCategories,
  type ComplaintCategory,
} from "../services/complaint.service";

interface CreateStaffModalProps {
  onClose: () => void;
  onSuccess: (email: string, password: string) => void;
}

const CreateStaffModal = ({ onClose, onSuccess }: CreateStaffModalProps) => {
  const user = useSelector(selectCurrentUser);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [staffType, setStaffType] = useState<"IN_HOUSE" | "VENDOR">("IN_HOUSE");
  const [specialization, setSpecialization] = useState("");

  // Data state
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  // Loading states
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories when modal opens
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await getComplaintCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      alert("Failed to load specializations. Please try again.");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.hostelId || !user?.organizationId) {
      alert("User information not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createStaff(
        {
          hostelId: user.hostelId,
          organizationId: user.organizationId,
        },
        {
          name,
          email,
          staffType,
          specialization,
        },
      );

      // Call onSuccess with credentials
      onSuccess(result.email, result.tempPassword);
      onClose();
    } catch (error: any) {
      console.error("Failed to create staff:", error);
      alert(
        error.response?.data?.error ||
          "Failed to create staff. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">
              Create New Staff Member
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              placeholder="Enter staff member's full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              placeholder="staff@example.com"
            />
          </div>

          {/* Staff Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Staff Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={staffType}
              onChange={(e) =>
                setStaffType(e.target.value as "IN_HOUSE" | "VENDOR")
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="IN_HOUSE">In-House Staff</option>
              <option value="VENDOR">Vendor</option>
            </select>
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Specialization <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              disabled={isLoadingCategories}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {isLoadingCategories
                  ? "Loading specializations..."
                  : "Select a specialization"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Specialization determines which complaint types this staff member
              can handle
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Staff"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStaffModal;
