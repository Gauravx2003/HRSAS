import { useNavigate } from "react-router-dom";
import { LogOut, Building2, User, Bell } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { LoggedInUser } from "../services/auth.service";
import NotificationPanel from "../components/NotificationPanel";
import {
  getMyNotifications,
  markNotificationAsRead,
  type Notification,
} from "../services/notification.service";

const TopBar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  console.log(user);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    fetchNotifications();
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-3 hidden md:block">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">
                HABITAT
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {user?.role === "RESIDENT" ? "Resident" : "Admin"} Portal
              </p>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all duration-200"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute top-2 right-2 h-2 w-2 bg-green-500 rounded-full border border-white transform translate-x-1/4 -translate-y-1/4"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 z-50 origin-top-right">
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
              )}
            </div>

            {user && (
              <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="pr-2">
                  <p className="text-sm font-semibold text-slate-700 leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <button
              onClick={logout}
              className="group flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium hidden sm:block">
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
