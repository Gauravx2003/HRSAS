import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "local" ? ".env.local" : ".env.production",
});

import authRoutes from "./modules/identity/auth/auth.routes";
import testRoutes from "./routes/test.routes";
import complaintRoutes from "./modules/support/complaints/complaints.routes";
import staffRoutes from "./modules/staff/staff.routes";
import attachmentsRoutes from "./modules/support/complaints/attachments.routes";
import lostAndFoundRoutes from "./modules/support/lostAndFound/lostAndFound.routes";
import lostFoundAttachmentsRoutes from "./modules/support/lostAndFound/lostFoundAttachments.routes";
import notificationsRoutes from "./modules/communication/notifications/notifications.routes";
import { runEscalationJob } from "./jobs/escalation.job";
import campusHubRoutes from "./modules/communication/campusHub/campusHub.routes";
import gatePassRoutes from "./modules/security/gatePass/gatePass.routes";
import visitorsRoutes from "./modules/security/visitors/visitors.routes";
import messIssueRoutes from "./modules/support/messIssue/messIssue.routes";
import userCreationRoutes from "./modules/identity/residentCreation/userCreation.routes";
import paymentRoutes from "./modules//finance/finesAndPayments/finesAndPayments.routes";
import messAttachmentsRoutes from "./modules/support/messIssue/messAttachments.routes";
import cron from "node-cron";
import membershipsRoutes from "./modules/facilities/memberships/memberships.routes";
import libraryRoutes from "./modules/facilities/library/library.routes";
import attendanceRoutes from "./modules/security/attendance/attendance.routes";
import campusHubAttachmentsRoutes from "./modules/communication/campusHub/campusHubAttachments.routes";
import smartMessRoutes from "./modules/smartMess/smartMess.routes";
import userRoutes from "./modules/identity/users/users.routes";
import orchestratorRoutes from "./modules/facilities/orchestrator/orchestrator.routes";
import infrastructureRoutes from "./modules/facilities/infrastructure/infrastructure.routes";
import marketplaceRouter from "./modules/facilities/marketplace/marketplace.routes";
import marketplaceAttachmentRoutes from "./modules/facilities/marketplace/marketplaceAttachment.routes";
import { startLibraryCron } from "./jobs/library.job";
import { startOrchestratorCron } from "./jobs/orchestrator.job";
import communitiesRoutes from "./modules/communication/communities/communities.routes";
import communitiesAttachmentsRoutes from "./modules/communication/communities/communitiesAttachments.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
});

cron.schedule("0 * * * *", () => {
  runEscalationJob().catch(console.error);
});

startLibraryCron();
startOrchestratorCron();

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/complaints", attachmentsRoutes);
app.use("/api/lost-and-found", lostAndFoundRoutes);
app.use("/api/lost-and-found", lostFoundAttachmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/campus-hub", campusHubRoutes);
app.use("/api/campus-hub", campusHubAttachmentsRoutes);
app.use("/api/gate-pass", gatePassRoutes);
app.use("/api/visitors", visitorsRoutes);
app.use("/api/mess-issues", messIssueRoutes);
app.use("/api/mess-issues", messAttachmentsRoutes);
app.use("/api/user-creation", userCreationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/memberships", membershipsRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/smart-mess", smartMessRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orchestrator", orchestratorRoutes);
app.use("/api/infrastructure", infrastructureRoutes);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/marketplace", marketplaceAttachmentRoutes);
app.use("/api/communities", communitiesRoutes);
app.use("/api/communities", communitiesAttachmentsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
