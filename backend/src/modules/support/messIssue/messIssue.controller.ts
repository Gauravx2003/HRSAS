import { Authenticate } from "../../../middleware/auth";
import { Response } from "express";
import {
  createMessComplaint,
  updateMessComplaint,
  getMessIssues,
  getMyIssues,
  getMessIssueAnalytics,
  getActiveContractor,
  terminateAndAddContractor,
} from "./messIssue.service";

import {
  messIssueCategoryEnum,
  messIssueStatusEnum,
  messIssues,
} from "../../../db/schema";
import { db } from "../../../db";
import { eq } from "drizzle-orm";

export const createMessComplaintController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { issueTitle, issueDescription, category } = req.body;
    const userId = req.user!.userId;

    const allowedCategories = messIssueCategoryEnum.enumValues;

    if (!issueTitle || !issueDescription || !category || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const newIssue = await createMessComplaint(
      issueTitle,
      issueDescription,
      userId,
      category,
    );
    return res.status(201).json(newIssue);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create mess issue" });
  }
};

export const updateMessComplaintController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const allowedStatuses = messIssueStatusEnum.enumValues;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedIssue = await updateMessComplaint(id, status, adminResponse);
    return res.status(200).json(updatedIssue);
  } catch (error: any) {
    if (error.message?.includes("Invalid transition")) {
      return res.status(400).json({ error: error.message });
    } else if (error.message?.includes("Admin response is required")) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: "Failed to update mess issue" });
  }
};

export const getAllMessIssuesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { status } = req.query;
    const issues = await getMessIssues(status as string);
    return res.status(200).json(issues);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch mess issues" });
  }
};

export const getMyMessIssuesController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const issues = await getMyIssues(req.user!.userId);
    return res.status(200).json(issues);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch mess issues" });
  }
};

export const getMessIssueAnalyticsController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const analytics = await getMessIssueAnalytics();
    return res.status(200).json(analytics);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getActiveContractorController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const hostelId = req.user?.hostelId;
    if (!hostelId) {
      return res.status(400).json({ error: "Hostel ID is required" });
    }

    const contractorDetails = await getActiveContractor(hostelId);
    return res.status(200).json(contractorDetails);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch active contractor" });
  }
};

export const terminateAndAddContractorController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const hostelId = req.user?.hostelId;
    if (!hostelId) {
      return res.status(400).json({ error: "Hostel ID is required" });
    }

    const { terminationReason, newContractorData } = req.body;

    if (
      !newContractorData ||
      !newContractorData.name ||
      !newContractorData.phone ||
      !newContractorData.address
    ) {
      return res
        .status(400)
        .json({ error: "Missing required new contractor details" });
    }

    // Set contract start date
    newContractorData.contractStartDate = new Date();

    const newContractor = await terminateAndAddContractor({
      hostelId,
      terminationReason: terminationReason || "No reason provided",
      newContractorData,
    });

    return res.status(201).json(newContractor);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to terminate and add contractor" });
  }
};
