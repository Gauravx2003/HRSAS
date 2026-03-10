import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  AlertTriangle,
  Package,
  DoorOpen,
  Users,
  ChevronDown,
  ChevronRight,
  CardSim,
  MessageSquareWarning,
  IndianRupee,
  Building2,
  WashingMachine,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { path: "/admin/escalations", icon: AlertTriangle, label: "Escalations" },
  { path: "/admin/lost-found", icon: Package, label: "Lost & Found" },
  {
    label: "Passes",
    icon: CardSim,
    children: [
      {
        path: "/admin/late-entry-exit",
        icon: DoorOpen,
        label: "Gate Passes",
      },
      {
        path: "/admin/visitor-requests",
        icon: Users,
        label: "Visitor Requests",
      },
    ],
  },

  {
    path: "/admin/fines-payments",
    icon: IndianRupee,
    label: "Fines & Payments",
  },
  {
    path: "/admin/mess-issues",
    icon: MessageSquareWarning,
    label: "Mess Issues",
  },
  { path: "/admin/campus-hub", icon: Bell, label: "CampusHub" },
  {
    path: "/admin/infrastructure",
    icon: Building2,
    label: "Infrastructure",
  },
  { path: "/admin/laundry", icon: WashingMachine, label: "Laundry" },
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
              className={`h-5 w-5 shrink-0 transition-colors ${
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
            className={`h-5 w-5 shrink-0 transition-colors ${
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

const AdminSidebar = () => {
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

export default AdminSidebar;
