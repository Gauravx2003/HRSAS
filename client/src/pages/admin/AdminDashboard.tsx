import { useState, useRef, useEffect } from "react";
import { UserPlus, ChevronDown } from "lucide-react";
import CreateResidentModal from "../../components/CreateResidentModal";
import CreateStaffModal from "../../components/CreateStaffModal";
import CredentialsModal from "../../components/CredentialsModal";

const AdminDashboard = () => {
  const [isCreateResidentModalOpen, setIsCreateResidentModalOpen] =
    useState(false);
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserCreated = (email: string, password: string) => {
    setCredentials({ email, password });
  };

  const handleCloseCredentials = () => {
    setCredentials(null);
  };

  const openResidentModal = () => {
    setIsCreateResidentModalOpen(true);
    setIsDropdownOpen(false);
  };

  const openStaffModal = () => {
    setIsCreateStaffModalOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage residents, staff, and hostel operations
          </p>
        </div>

        {/* Create User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            Create User
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={openResidentModal}
                className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-2 text-slate-700 hover:text-indigo-700"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">New Resident</span>
              </button>
              <div className="border-t border-slate-100"></div>
              <button
                onClick={openStaffModal}
                className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-2 text-slate-700 hover:text-indigo-700"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">New Staff</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-600">
          Welcome to the Admin Dashboard. Use the "Create User" button to add
          new residents or staff members.
        </p>
      </div>

      {/* Modals */}
      {isCreateResidentModalOpen && (
        <CreateResidentModal
          onClose={() => setIsCreateResidentModalOpen(false)}
          onSuccess={handleUserCreated}
        />
      )}

      {isCreateStaffModalOpen && (
        <CreateStaffModal
          onClose={() => setIsCreateStaffModalOpen(false)}
          onSuccess={handleUserCreated}
        />
      )}

      {credentials && (
        <CredentialsModal
          email={credentials.email}
          password={credentials.password}
          onClose={handleCloseCredentials}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
