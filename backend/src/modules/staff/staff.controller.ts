import { Authenticate } from "../../middleware/auth";
import { getAssignedComplaints } from "./staff.service";
import { Response } from "express";
import { updateComplaintStatus } from "./staff.service";

export const getAssignedComplaintsController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const conplaints = await getAssignedComplaints(req.user!.userId);
    return res.status(200).json(conplaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateComplaintStatusController = async (
  req: Authenticate,
  res: Response
) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const updatedComplaint = await updateComplaintStatus(
      id,
      status,
      req.user!.userId
    );
    return res.status(200).json(updatedComplaint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
