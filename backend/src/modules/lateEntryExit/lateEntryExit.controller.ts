import { Authenticate } from "../../middleware/auth";
import { Response } from "express";
import {
  createRequest,
  getMyRequests,
  getPendingRequests,
  updateRequest,
  getApprovedRequests,
} from "./lateEntryExit.service";
import { db } from "../../db";
import { getTableColumns, eq } from "drizzle-orm";
import {
  lateEntryRequests,
  residentProfiles,
  rooms,
  users,
} from "../../db/schema";

export const createRequestController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { reason, fromTime, toTime, type, time } = req.body;

    let finalFromTime: Date;
    let finalToTime: Date;
    const requestDate = time ? new Date(time) : new Date();

    if (type === "OVERNIGHT") {
      finalFromTime = new Date(fromTime);
      finalToTime = new Date(toTime);
    } else if (type == "EXIT") {
      if (!time)
        return res
          .status(400)
          .json({ message: "Expected departure time needed" });

      finalFromTime = new Date(requestDate.getTime() - 30 * 60 * 1000);
      finalToTime = new Date(requestDate.getTime() + 30 * 60 * 1000);
    } else if (type == "ENTRY") {
      if (!time)
        return res
          .status(400)
          .json({ message: "Expected departure time needed" });

      finalFromTime = requestDate;
      finalToTime = new Date(requestDate.getTime() + 60 * 60 * 1000);
    } else {
      return res.status(400).json({ message: "Invalid request type" });
    }

    if (finalFromTime > finalToTime) {
      return res
        .status(400)
        .json({ message: "From time should be less than to time" });
    }

    const newRequest = await createRequest(
      req.user!.userId,
      type,
      reason,
      finalFromTime,
      finalToTime,
    );

    res.status(201).json({
      message: "Late entry request created successfully",
      request: newRequest,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to create late entry request" });
  }
};

export const getMyRequestsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const requests = await getMyRequests(req.user!.userId);
    res.status(200).json(requests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};

export const getPendingRequestsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const pendingRequests = await getPendingRequests();
    res.status(200).json(pendingRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};

export const updateRequestController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await updateRequest(id, status);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to update late entry request" });
  }
};

export const getApprovedRequestsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const result = await getApprovedRequests();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};

export const getAllRequestsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const result = await db
      .select({
        ...getTableColumns(lateEntryRequests),
        residentName: users.name,
        residentRoomNumber: rooms.roomNumber,
      })
      .from(lateEntryRequests)
      .leftJoin(users, eq(lateEntryRequests.residentId, users.id))
      .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id));
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get late entry requests" });
  }
};
