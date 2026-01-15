import type { Notification } from "../services/notification.service";
import { Check, Clock, Bell, X } from "lucide-react";

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

const NotificationPanel = ({
  notifications,
  onMarkAsRead,
  onClose,
}: NotificationPanelProps) => {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <Bell className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Notifications</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <ul className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`p-4 transition-colors hover:bg-slate-50 ${
                !notification.isRead ? "bg-indigo-50/30" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    !notification.isRead ? "bg-green-500" : "bg-slate-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      !notification.isRead
                        ? "text-slate-900 font-medium"
                        : "text-slate-600"
                    }`}
                  >
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className="text-indigo-600 hover:text-indigo-700 p-1 rounded-full hover:bg-indigo-50 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotificationPanel;
