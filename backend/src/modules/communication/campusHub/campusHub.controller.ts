import { Authenticate } from "../../../middleware/auth";
import { Response } from "express";
import {
  createEvent,
  createNotice,
  getCampusHubData,
  updateEvent,
  deleteEvent,
  updateNotice,
  deleteNotice,
} from "./campusHub.service";
import { sendPushNotificationToAll } from "../../../services/notification.service";
import redis from "../../../config/redis";

// 1. Create Event (Admin Only)
export const createEventController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { title, description, startDate, location, bannerUrl, category } =
      req.body;

    // Ensure user has a hostelId
    if (!req.user?.hostelId)
      return res.status(400).json({ message: "Hostel ID missing" });

    const newEvent = await createEvent({
      hostelId: req.user.hostelId,
      title,
      description,
      startDate: new Date(startDate), // Ensure frontend sends ISO string
      location,
      bannerUrl,
      category: category || "CULTURAL",
    });

    sendPushNotificationToAll(
      `🎉 New Event: ${title}`,
      "Check the Campus Hub for details.",
      {
        route: "/(resident)/campus-hub",
        params: { tab: "Events" },
      },
    );

    await redis.del("campus_hub_data");

    res.status(201).json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create event" });
  }
};

export const updateEventController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, location, bannerUrl, category } =
      req.body;
    const updatedEvent = await updateEvent(id, {
      title,
      description,
      startDate: new Date(startDate), // Ensure frontend sends ISO string
      location,
      bannerUrl,
      category: category || "CULTURAL",
    });
    await redis.del("campus_hub_data");
    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update event" });
  }
};

export const deleteEventController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    await deleteEvent(id);
    await redis.del("campus_hub_data");
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete event" });
  }
};

// 2. Create Notice / Schedule (Admin Only)
export const createNoticeController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    // 'scheduledFor' is optional, mainly for SCHEDULE type
    const { title, description, type, scheduledFor } = req.body;

    if (!req.user?.hostelId)
      return res.status(400).json({ message: "Hostel ID missing" });

    const newNotice = await createNotice({
      hostelId: req.user.hostelId,
      title,
      description,
      type: type || "ANNOUNCEMENT", // ANNOUNCEMENT, EMERGENCY, or SCHEDULE
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    });

    if (type === "EMERGENCY") {
      // Fire and forget (don't await, so the API response is fast)
      sendPushNotificationToAll(
        `🚨 URGENT: ${title}`,
        description.substring(0, 100), // Keep body short
        {
          route: "/(resident)/campus-hub",
          params: { tab: "Notices" },
        },
      );
    } else if (type === "ANNOUNCEMENT") {
      // Optional: Send softer notification for normal announcements
      sendPushNotificationToAll(
        `📢 New Notice: ${title}`,
        "Check the Campus Hub for details.",
        {
          route: "/(resident)/campus-hub",
          params: { tab: "Notices" },
        },
      );
    } else if (type === "SCHEDULE") {
      sendPushNotificationToAll(
        `📅 New Schedule: ${title}`,
        "Check the Campus Hub for details.",
        {
          route: "/(resident)/campus-hub",
          params: { tab: "Schedule" },
        },
      );
    }

    await redis.del("campus_hub_data");

    res.status(201).json(newNotice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create notice" });
  }
};

export const updateNoticeController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { title, description, type, scheduledFor } = req.body;
    console.log(title, description, type, scheduledFor);
    const updatedNotice = await updateNotice(id, {
      title,
      description,
      type,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    });
    await redis.del("campus_hub_data");
    res.status(200).json(updatedNotice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update notice" });
  }
};

export const deleteNoticeController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    await deleteNotice(id);
    await redis.del("campus_hub_data");
    res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete notice" });
  }
};

// 3. Get All Data (Resident View)
export const getHubDataController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const cacheKey = "campus_hub_data";

    if (!req.user?.hostelId)
      return res.status(400).json({ message: "Hostel ID missing" });

    // Check if user is admin
    const isAdmin = req.user.role === "ADMIN";

    // 1. Check Redis First
    const cachedData = await redis.get(cacheKey);

    // if (cachedData) {
    //   console.log("⚡ Returning Cached Data");
    //   return res.status(200).json(JSON.parse(cachedData));
    // }

    console.log("🐢 Fetching from Database...");

    const data = await getCampusHubData(req.user.hostelId, isAdmin);

    await redis.setex(cacheKey, 3600, JSON.stringify(data));

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch hub data" });
  }
};
