import bcrypt from "bcrypt";
import { db } from "../../../db";
import {
  users,
  residentProfiles,
  rooms,
  blocks,
  organizations,
} from "../../../db/schema";
import { eq, getTableColumns } from "drizzle-orm";
import jwt from "jsonwebtoken";
import redis from "../../../config/redis";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET =
  process.env.REFRESH_SECRET || "some_super_secret_refresh_key";

const generateTokens = (payload: any) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" }); // Short Life
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" }); // Long Life
  return { accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const [user] = await db
    .select({
      ...getTableColumns(users),
      roomNumber: rooms.roomNumber,
      roomId: rooms.id,
      blockName: blocks.name,
      blockId: blocks.id,
    })
    .from(users)
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .leftJoin(blocks, eq(rooms.blockId, blocks.id))
    .where(eq(users.email, email));

  if (!user) {
    throw new Error("Invalid Credentials");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new Error("Invalid Credentials");
  }

  const sessionId = uuidv4();

  const tokenPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    hostelId: user.hostelId,
    sessionId: sessionId,
  };

  const { accessToken, refreshToken } = generateTokens(tokenPayload);

  const redisKey = `refresh_token:${user.id}:${sessionId}`;
  await redis.set(redisKey, refreshToken, "EX", 7 * 24 * 60 * 60);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hostelId: user.hostelId,
      blockId: user.blockId,
      blockName: user.blockName,
      roomId: user.roomId,
      roomNumber: user.roomNumber,
      organizationId: user.organizationId,
      profilePicUrl: user.profilePicUrl,
    },
  };
};

export const refreshUserToken = async (incomingRefreshToken: string) => {
  try {
    // 1. Verify Signature
    const decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET) as any;

    // 2. Check Redis: Is this session still active?
    const redisKey = `refresh_token:${decoded.userId}:${decoded.sessionId}`;
    const storedToken = await redis.get(redisKey);

    if (!storedToken || storedToken !== incomingRefreshToken) {
      throw new Error("Invalid or Expired Refresh Token");
    }

    // 3. Generate NEW Access Token
    const payload = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
      hostelId: decoded.hostelId,
      sessionId: decoded.sessionId,
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

    // Optional: You can also rotate the refresh token here for extra security

    return { accessToken: newAccessToken };
  } catch (error) {
    throw new Error("Session expired, please login again");
  }
};
