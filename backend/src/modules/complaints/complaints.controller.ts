import { Request, Response } from "express";
import { Authenticate } from "../../middleware/auth";
import { createComplaint } from "./complaints.service";

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
