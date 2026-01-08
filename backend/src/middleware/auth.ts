import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface Authenticate extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
    hostelId: string;
  };
}

export const authenticate = (
  req: Authenticate,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded as Authenticate["user"];
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
