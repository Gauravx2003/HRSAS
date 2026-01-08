import Router from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { raiseComplaint } from "./complaints.controller";

const router = Router();

router.post("/", authenticate, authorize(["RESIDENT"]), raiseComplaint);

export default router;
