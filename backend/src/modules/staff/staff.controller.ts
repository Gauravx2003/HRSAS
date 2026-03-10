import { Authenticate } from "../../middleware/auth";
import {
  getAssignedComplaints,
  updateComplaintByVendor,
  getComplaintForVendor,
} from "./staff.service";
import { Request, Response } from "express";
import { db } from "../../db";
import {
  complaints,
  hostels,
  organizations,
  securityProfiles,
  staffProfiles,
  users,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  updateComplaintStatus,
  getStaffBySpecialization,
  updateStaffStatus,
} from "./staff.service";
import redis from "../../config/redis";

export const getAssignedComplaintsController = async (
  req: Authenticate,
  res: Response,
) => {
  const { status } = req.query;

  try {
    const conplaints = await getAssignedComplaints(
      req.user!.userId,
      status as "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED",
    );
    return res.status(200).json(conplaints);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateComplaintStatusController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const updatedComplaint = await updateComplaintStatus(
      id,
      status,
      req.user!.userId,
    );
    return res.status(200).json(updatedComplaint);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const vendorGetComplaintController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const complaint = await getComplaintForVendor(id, token);
    return res.status(200).json(complaint);
  } catch (error: any) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res
        .status(401)
        .json({ message: "This link has expired or is invalid." });
    }
    return res
      .status(400)
      .json({ message: error.message || "Failed to fetch ticket" });
  }
};

export const vendorUpdateComplaintController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params; // complaintId
    const { token, newStatus } = req.body;

    if (!token || !newStatus) {
      return res
        .status(400)
        .json({ message: "Token and newStatus are required" });
    }

    const updatedComplaint = await updateComplaintByVendor(
      id,
      token,
      newStatus,
    );

    return res.status(200).json({
      message: "Ticket updated successfully",
      complaint: updatedComplaint,
    });
  } catch (error: any) {
    // Catch JWT expiration or tampering
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res
        .status(401)
        .json({ message: "This link has expired or is invalid." });
    }
    return res
      .status(400)
      .json({ message: error.message || "Failed to update ticket" });
  }
};

export const getStaffBySpecializationController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { specialization } = req.query;

    if (!specialization || typeof specialization !== "string") {
      return res.status(400).json({ message: "Specialization is required" });
    }

    const staff = await getStaffBySpecialization(specialization);
    return res.status(200).json(staff);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getStaffProfileController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const cacheKey = `staff:profile:${user.userId}`;

    const cachedProfile = await redis.get(cacheKey);
    // if (cachedProfile) {
    //   return res.json(JSON.parse(cachedProfile));
    // }

    const [profile] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        dateOfBirth: users.dateOfBirth,
        specialization: staffProfiles.specialization,
        role: users.role,
        organization: organizations.name,
        hostel: hostels.name,
        currentTasks: staffProfiles.currentTasks,
        createdAt: users.createdAt,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(staffProfiles, eq(users.id, staffProfiles.userId))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .leftJoin(hostels, eq(users.hostelId, hostels.id))
      .where(eq(users.id, user.userId));

    await redis.set(cacheKey, JSON.stringify(profile), "EX", 86400);

    return res.json({ ...profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSecurityProfileController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const cacheKey = `security:profile:${user.userId}`;

    const cachedProfile = await redis.get(cacheKey);
    // if (cachedProfile) {
    //   return res.json(JSON.parse(cachedProfile));
    // }

    const [profile] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        dateOfBirth: users.dateOfBirth,
        assignedGate: securityProfiles.assignedGate,
        shift: securityProfiles.shift,
        role: users.role,
        organization: organizations.name,
        hostel: hostels.name,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(securityProfiles, eq(users.id, securityProfiles.userId))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .leftJoin(hostels, eq(users.hostelId, hostels.id))
      .where(eq(users.id, user.userId));

    // await redis.set(cacheKey, JSON.stringify(profile), "EX", 86400);

    return res.json({ ...profile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateStaffStatusController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const { isActive } = req.body;
    const userId = req.user!.userId;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive status is required" });
    }

    const updatedUser = await updateStaffStatus(userId, isActive);
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
