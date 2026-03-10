import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  X,
  UserCog,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import { useToast } from "../common/Toast";

interface ContractorData {
  contractor: {
    id: string;
    name: string;
    organizationName: string | null;
    phone: string;
    email: string | null;
    address: string;
    fssaiLicenseNumber: string | null;
    contractStartDate: string;
  };
  approvalRating: number;
  healthStatus: "Green" | "Yellow" | "Red";
  warningMessage: string | null;
  foodIssuesCount: number;
}

const AdminContractorTab = () => {
  const [data, setData] = useState<ContractorData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    terminationReason: "",
    newName: "",
    newOrganizationName: "",
    newPhone: "",
    newEmail: "",
    newAddress: "",
    newFssaiLicenseNumber: "",
  });

  const fetchContractor = async () => {
    try {
      setLoading(true);
      const response = await api.get("/mess-issues/contractor");
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch contractor data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractor();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.newName || !formData.newPhone || !formData.newAddress) {
      showToast("Please fill all required new contractor fields.", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/mess-issues/contractor/terminate", {
        terminationReason: formData.terminationReason,
        newContractorData: {
          name: formData.newName,
          organizationName: formData.newOrganizationName || null,
          phone: formData.newPhone,
          email: formData.newEmail || null,
          address: formData.newAddress,
          fssaiLicenseNumber: formData.newFssaiLicenseNumber || null,
        },
      });

      showToast("Contractor transition successful!", "success");
      setIsTerminateModalOpen(false);
      // Reset form
      setFormData({
        terminationReason: "",
        newName: "",
        newOrganizationName: "",
        newPhone: "",
        newEmail: "",
        newAddress: "",
        newFssaiLicenseNumber: "",
      });
      // Refresh data
      fetchContractor();
    } catch (error: any) {
      console.error(error);
      showToast(
        error.response?.data?.error || "Failed to update contractor",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Get color logic for health widget
  const getHealthColors = (status: "Green" | "Yellow" | "Red" | undefined) => {
    switch (status) {
      case "Green":
        return "bg-green-50 text-green-700 border-green-200 stroke-green-500";
      case "Yellow":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 stroke-yellow-500";
      case "Red":
        return "bg-red-50 text-red-700 border-red-200 stroke-red-500";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 stroke-slate-500";
    }
  };

  const colors = getHealthColors(data?.healthStatus);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {data?.warningMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-bold mb-1">Critical Warning</h3>
            <p className="text-red-700 text-sm">{data.warningMessage}</p>
          </div>
        </div>
      )}

      {!data && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800">
            No Active Contractor found
          </h3>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            There is currently no active contractor managed in the system.
          </p>
          <button
            onClick={() => setIsTerminateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Add Contractor
          </button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <UserCog className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      {data.contractor.name}
                    </h2>
                    <p className="text-slate-500 font-medium flex items-center gap-1 mt-1">
                      <Building2 className="w-4 h-4" />
                      {data.contractor.organizationName || "Independent Vendor"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTerminateModalOpen(true)}
                  className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-medium transition-colors text-sm"
                >
                  Terminate Contract
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">
                      Contact
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {data.contractor.phone}
                    </p>
                  </div>
                </div>
                {data.contractor.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Email
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {data.contractor.email}
                      </p>
                    </div>
                  </div>
                )}
                {data.contractor.fssaiLicenseNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        FSSAI License
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {data.contractor.fssaiLicenseNumber}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">
                      Contract Start Date
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {new Date(
                        data.contractor.contractStartDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Widget */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
              Approval Rating
            </h3>

            {/* Circular Progress */}
            <div className="relative w-40 h-40 mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className="stroke-slate-100"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className={`${colors.split(" ").find((c) => c.startsWith("stroke-"))} transition-all duration-1000 ease-in-out`}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="439.8" // 2 * pi * r
                  strokeDashoffset={439.8 - (439.8 * data.approvalRating) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">
                  {data.approvalRating}%
                </span>
              </div>
            </div>

            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold border ${colors}`}
            >
              {data.healthStatus === "Green" && "Excellent"}
              {data.healthStatus === "Yellow" && "Needs Improvement"}
              {data.healthStatus === "Red" && "Critical Action Required"}
            </span>

            <p className="text-xs text-slate-500 mt-4">
              Based on {data.foodIssuesCount} food complaint(s) since contract
              start.
            </p>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {isTerminateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-12 mb-12">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {data
                  ? "Terminate & Add New Contractor"
                  : "Add Initial Contractor"}
              </h2>
              <button
                onClick={() => setIsTerminateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleTerminateSubmit} className="p-6">
              <div className="space-y-6">
                {/* Only show termination reason if there's a contractor to terminate */}
                {data && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Termination Details
                    </h3>
                    <div className="bg-rose-50 rounded-lg p-4 mb-2">
                      <label className="block text-sm font-medium text-rose-900 mb-1">
                        Reason for Terminating {data.contractor.name}
                      </label>
                      <textarea
                        name="terminationReason"
                        required
                        value={formData.terminationReason}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-rose-200 rounded-md focus:ring-rose-500 focus:border-rose-500 bg-white resize-none text-sm"
                        placeholder="e.g., Repeated hygiene violations..."
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-indigo-600" />
                    New Contractor Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="newName"
                        required
                        value={formData.newName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        name="newOrganizationName"
                        value={formData.newOrganizationName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Fresh Foods Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="newPhone"
                        required
                        value={formData.newPhone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="newEmail"
                        value={formData.newEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="contact@freshfoods.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        FSSAI License Number
                      </label>
                      <input
                        type="text"
                        name="newFssaiLicenseNumber"
                        value={formData.newFssaiLicenseNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="100200..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Full Address *
                      </label>
                      <textarea
                        name="newAddress"
                        required
                        value={formData.newAddress}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white resize-none text-sm"
                        placeholder="123 Business Park, City..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsTerminateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  {data ? "Confirm Transition" : "Add Contractor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContractorTab;
