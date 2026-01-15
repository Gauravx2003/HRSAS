import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "local" ? ".env.local" : ".env.production",
});

import authRoutes from "./modules/auth/auth.routes";
import testRoutes from "./routes/test.routes";
import complaintRoutes from "./modules/complaints/complaints.routes";
import staffRoutes from "./modules/staff/staff.routes";
import attachmentsRoutes from "./modules/complaints/attachments.routes";
import lostAndFoundRoutes from "./modules/lostAndFound/lostAndFound.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import { runEscalationJob } from "./jobs/escalation.job";
import noticesRoutes from "./modules/notices/notices.routes";
import lateEntryExitRoutes from "./modules/lateEntryExit/lateEntryExit.routes";
import visitorsRoutes from "./modules/visitors/visitors.routes";
import cron from "node-cron";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
});

// cron.schedule("*/10 * * * *", () => {
//   runEscalationJob().catch(console.error);
// });

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/complaints", attachmentsRoutes);
app.use("/api/lost-and-found", lostAndFoundRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/notices", noticesRoutes);
app.use("/api/late-entry-exit", lateEntryExitRoutes);
app.use("/api/visitors", visitorsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
