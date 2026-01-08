import { Router } from "express";
import { Response } from "express";
import { authenticate, authorize, Authenticate } from "../middleware/auth";

const router = Router();

router.get("/me", authenticate, (req: Authenticate, res) => {
  res.json({ message: "Authenticated", user: req.user });
});

router.get("/admin", authenticate, authorize(["ADMIN"]), (_req, res) => {
  res.json({ message: "Admin" });
});

router.get("/staff", authenticate, authorize(["STAFF"]), (_req, res) => {
  res.json({ message: "Staff" });
});

export default router;
