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
import lostFoundAttachmentsRoutes from "./modules/lostAndFound/lostFoundAttachments.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import { runEscalationJob } from "./jobs/escalation.job";
import noticesRoutes from "./modules/notices/notices.routes";
import gatePassRoutes from "./modules/gatePass/gatePass.routes";
import visitorsRoutes from "./modules/visitors/visitors.routes";
import messIssueRoutes from "./modules/messIssue/messIssue.routes";
import userCreationRoutes from "./modules/residentCreation/userCreation.routes";
import paymentRoutes from "./modules/finesAndPayments/finesAndPayments.routes";
import messAttachmentsRoutes from "./modules/messIssue/messAttachments.routes";
import cron from "node-cron";
import membershipsRoutes from "./modules/memberships/memberships.routes";
import libraryRoutes from "./modules/library/library.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
});

// cron.schedule("* * * * *", () => {
//   runEscalationJob().catch(console.error);
// });

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/complaints", attachmentsRoutes);
app.use("/api/lost-and-found", lostAndFoundRoutes);
app.use("/api/lost-and-found", lostFoundAttachmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/notices", noticesRoutes);
app.use("/api/gate-pass", gatePassRoutes);
app.use("/api/visitors", visitorsRoutes);
app.use("/api/mess-issues", messIssueRoutes);
app.use("/api/mess-issues", messAttachmentsRoutes);
app.use("/api/user-creation", userCreationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/memberships", membershipsRoutes);
app.use("/api/library", libraryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
