import { useEffect, useState } from "react";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "../services/notification.service";

import type { Notification } from "../services/notification.service";

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    try {
      const notifications = await getMyNotifications();
      setNotifications(notifications);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notification) => (
          <li key={notification.id}>
            <p>{notification.message}</p>
            {!notification.isRead ? (
              <button onClick={() => markNotificationAsRead(notification.id)}>
                Mark as Read
              </button>
            ) : (
              <p>Read</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationPanel;
