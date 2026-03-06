import { Router } from "express";
import { authenticate } from "../../../middleware/auth";
import {
  createListingController,
  getListingsController,
  getMyListingsController,
  getMyBidsController,
  getBidsForItemController,
  deleteListingController,
  placeBidController,
  acceptBidController,
  confirmHandoverController,
  cancelHandoverController,
} from "./marketplace.controller";

const marketplaceRouter = Router();

// Apply authenticate middleware to all marketplace routes
marketplaceRouter.use(authenticate);

// 1. Browsing & Listing
marketplaceRouter.get("/items", getListingsController);
marketplaceRouter.post("/items", createListingController);
marketplaceRouter.get("/my", getMyListingsController);
marketplaceRouter.get("/my/bids", getMyBidsController);

// 2. Bidding
marketplaceRouter.post("/items/:itemId/bids", placeBidController);
marketplaceRouter.get("/items/:itemId/bids", getBidsForItemController);

// 3. Managing Offers & Handovers (Seller Actions)
marketplaceRouter.post("/bids/:bidId/accept", acceptBidController);
marketplaceRouter.post("/items/:itemId/confirm", confirmHandoverController);
marketplaceRouter.post("/items/:itemId/cancel", cancelHandoverController);
marketplaceRouter.delete("/items/:itemId", deleteListingController);

export default marketplaceRouter;
