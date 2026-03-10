import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redis from "../config/redis";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface Authenticate extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    hostelId: string;
    sessionId: string;
  };
}

interface Token {
  userId: string;
  organizationId: string;
  role: string;
  hostelId: string;
  sessionId: string;
}

export const authenticate = async (
  req: Authenticate,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Token;

    const redisKey = `refresh_token:${decoded.userId}:${decoded.sessionId}`;
    const sessionActive = await redis.exists(redisKey);

    if (!sessionActive) {
      return res.status(401).json({ message: "Session expired or logged out" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Authenticate, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(401).json({ message: "Forbidden" });
    }

    next();
  };
};

export const loginRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || req.socket.remoteAddress;
  const key = `login_attempts:${ip}`;

  const attempts = await redis.get(key);

  if (attempts && parseInt(attempts) >= 5) {
    return res
      .status(429)
      .json({ message: "Too many login attempts. Try again in 15 minutes." });
  }

  await redis.incr(key);
  // Set expiry only if key is new (TTL 15 mins)
  if (!attempts) {
    await redis.expire(key, 900);
  }

  next();
};
