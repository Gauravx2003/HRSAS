import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, Undo2, Library } from "lucide-react";

const navItems = [
  { path: "/librarian", icon: LayoutDashboard, label: "Dashboard", end: true },
  { path: "/librarian/issue-desk", icon: BookOpen, label: "Issue Desk" },
  { path: "/librarian/return-desk", icon: Undo2, label: "Return Desk" },
  { path: "/librarian/inventory", icon: Library, label: "Inventory" },
];

const LibrarianSidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:block min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
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
        })}
      </div>
    </aside>
  );
};

export default LibrarianSidebar;
