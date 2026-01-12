import api from "./api";

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const getMyNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data as Notification[];
};

export const markNotificationAsRead = async (notificationId: string) => {
  await api.patch(`/notifications/${notificationId}/read`);
};
