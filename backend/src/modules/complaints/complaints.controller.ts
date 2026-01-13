import { Request, Response } from "express";
import { Authenticate } from "../../middleware/auth";
import {
  createComplaint,
  getMyComplaints,
  getEscalatedComplaints,
} from "./complaints.service";

export const raiseComplaint = async (req: Authenticate, res: Response) => {
  try {
    const { roomId, categoryId, description } = req.body;

    if (!roomId || !categoryId || !description) {
      return res.status(400).json({ message: "Bad Request" });
    }

    const complaint = await createComplaint(
      req.user!.userId,
      roomId,
      categoryId,
      description
    );

    return res.status(201).json(complaint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyComplaintsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const myComplaints = await getMyComplaints(req.user!.userId);
    return res.status(200).json(myComplaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getEscalatedComplaintsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const escalatedComplaints = await getEscalatedComplaints();
    return res.status(200).json(escalatedComplaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
