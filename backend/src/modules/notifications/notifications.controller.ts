import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "./notifications.service";

export const getMyNotificationsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const notifications = await getMyNotifications(req.user!.userId);
    return res.status(200).json(notifications);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markNotificationAsReadController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { id } = req.params;
    const notification = await markNotificationAsRead(id, req.user!.userId);
    return res.status(200).json(notification);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
