import bcrypt from "bcrypt";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export const loginUser = async (email: string, password: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user || !user.isActive) {
    throw new Error("Invalid Credentials");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new Error("Invalid Credentials");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      hostelId: user.hostelId,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
