import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  AlertTriangle,
  Package,
  DoorOpen,
  IndianRupee,
} from "lucide-react";

const AdminSidebar = () => {
  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { path: "/admin/escalations", icon: AlertTriangle, label: "Escalations" },
    { path: "/admin/lost-found", icon: Package, label: "Lost & Found" },
    {
      path: "/admin/late-entry-exit",
      icon: DoorOpen,
      label: "Entry/Exit Approvals",
    },
    {
      path: "/admin/fines-payments",
      icon: IndianRupee,
      label: "Fines & Payments",
    },
    { path: "/admin/notices", icon: Bell, label: "Notices" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default AdminSidebar;
