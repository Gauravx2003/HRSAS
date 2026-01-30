import { loginUser } from "./auth.service";
import { Request, Response } from "express";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const result = await loginUser(email, password);

    //console.log(result);

    return res.json(result);
  } catch (err) {
    return res.status(401).json({ message: "Invalid Credentials" });
  }
};
