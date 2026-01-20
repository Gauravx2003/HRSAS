import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Search,
  Bell,
  PackageCheck,
  Home,
  UtensilsCrossed,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { path: "/resident", icon: LayoutDashboard, label: "Dashboard", end: true },
  {
    label: "Complaints",
    icon: MessageSquareWarning,
    children: [
      {
        path: "/resident/complaints",
        label: "Hostel Complaints",
        icon: Home, // Optional: Add icons to children if you want
      },
      {
        path: "/resident/mess-issues",
        label: "Mess Complaints",
        icon: UtensilsCrossed, // Optional
      },
    ],
  },
  { path: "/resident/lost-items", icon: Search, label: "My Lost Items" },
  { path: "/resident/notices", icon: Bell, label: "Notices" },
  { path: "/resident/found-items", icon: PackageCheck, label: "Found Items" },
];

const SidebarItem = ({ item }: { item: any }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;

  // CASE 1: It's a Dropdown (has children)
  if (item.children) {
    // Keep menu open if we are currently on one of the child paths
    const isActiveParent = item.children.some(
      (child: any) => location.pathname === child.path,
    );

    // Auto-open if a child is active (optional, but good UX)
    if (isActiveParent && !isOpen) setIsOpen(true);

    return (
      <div className="space-y-1">
        {/* Parent Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
            isActiveParent || isOpen
              ? "bg-slate-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Icon
              className={`h-5 w-5 flex-shrink-0 transition-colors ${
                isActiveParent || isOpen
                  ? "text-indigo-600"
                  : "text-slate-400 group-hover:text-slate-600"
              }`}
            />
            <span>{item.label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {/* Children Links */}
        {isOpen && (
          <div className="pl-4 space-y-1 border-l-2 border-slate-100 ml-3">
            {item.children.map((child: any) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-indigo-700 bg-indigo-50/50"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`
                }
              >
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  // CASE 2: Regular Link (Your original code)
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
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
  );
};

const ResidentSidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        {navItems.map((item, index) => (
          // Use key={item.label} because some items might not have a path
          <SidebarItem key={item.label || index} item={item} />
        ))}
      </div>
    </aside>
  );
};

export default ResidentSidebar;
