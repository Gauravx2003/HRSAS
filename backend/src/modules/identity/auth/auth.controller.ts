import { loginUser, refreshUserToken } from "./auth.service";
import { Request, Response } from "express";
import { Authenticate } from "../../../middleware/auth";
import redis from "../../../config/redis";
import { db } from "../../../db";
import {
  users,
  residentProfiles,
  roomTypes,
  rooms,
  blocks,
  organizations,
  hostels,
} from "../../../db/schema";
import { eq } from "drizzle-orm";
import { loginSchema } from "../../../middleware/validation/login.validate";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    console.log(email, password);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const result = await loginUser(email, password);

    return res.json(result);
  } catch (err) {
    return res.status(401).json({ message: "Invalid Credentials" });
  }
};

export const logoutController = async (req: Authenticate, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "Not authenticated" });

    const { userId, sessionId } = req.user;

    await db
      .update(users)
      .set({ pushToken: null }) // 👈 THE CRITICAL FIX
      .where(eq(users.id, userId));

    // UPDATE: Delete the Refresh Token key
    const redisKey = `refresh_token:${userId}:${sessionId}`;
    await redis.del(redisKey);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ message: "Logout failed" });
  }
};

export const refreshTokenController = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body; // Client sends this

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh Token is required" });
    }

    const result = await refreshUserToken(refreshToken);
    return res.json(result); // Returns { accessToken: "..." }
  } catch (err: any) {
    return res.status(403).json({ message: err.message || "Invalid Token" });
  }
};

export const getMyProfileController = async (
  req: Authenticate,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // const cacheKey = `user:profile:${user.userId}`;

    // const cachedProfile = await redis.get(cacheKey);
    // if (cachedProfile) {
    //   return res.json(JSON.parse(cachedProfile));
    // }

    const [profile] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        dateOfBirth: users.dateOfBirth,
        department: residentProfiles.department,
        departmentId: residentProfiles.departmentId,
        role: users.role,
        hostel: hostels.name,
        block: blocks.name,
        roomNumber: rooms.roomNumber,
        isActive: users.isActive,
        roomType: roomTypes.name,
        organization: organizations.name,
        profilePicUrl: users.profilePicUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
      .leftJoin(roomTypes, eq(rooms.type, roomTypes.id))
      .leftJoin(blocks, eq(rooms.blockId, blocks.id))
      .leftJoin(hostels, eq(blocks.hostelId, hostels.id))
      .leftJoin(organizations, eq(hostels.organizationId, organizations.id))
      .where(eq(users.id, user.userId));

    // await redis.set(cacheKey, JSON.stringify(profile), "EX", 86400);

    return res.json({ ...profile });
  } catch (err) {
    console.error("Get My Profile Error:", err);
    res.status(500).json({ message: "Failed to get profile" });
  }
};
