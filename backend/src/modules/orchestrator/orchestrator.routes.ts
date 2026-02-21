import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  getResourcesController,
  getAvailableSlotsController,
  bookSlotController,
  joinWaitlistController,
  cancelSlotController,
  getMyQueueController,
} from "./orchestrator.controller";

const orchestratorRouter = Router();

// Get the visual dashboard data
orchestratorRouter.get("/resources", authenticate, getResourcesController);
orchestratorRouter.get(
  "/resources/:resourceId/slots",
  authenticate,
  getAvailableSlotsController,
);
orchestratorRouter.get("/my-queue", authenticate, getMyQueueController);

// Actions
orchestratorRouter.post("/book", authenticate, bookSlotController);
orchestratorRouter.post("/waitlist", authenticate, joinWaitlistController);
orchestratorRouter.post(
  "/cancel/:bookingId",
  authenticate,
  cancelSlotController,
);

export default orchestratorRouter;
