import { db } from "../../../db";
import {
  marketplaceItems,
  itemBids,
  users,
  marketplaceAttachments,
} from "../../../db/schema";
import { eq, and, ne, desc } from "drizzle-orm";

// ─── 1. CORE LISTING & BROWSING ───

export const createListing = async (
  sellerId: string,
  hostelId: string,
  data: {
    title: string;
    description: string;
    category: string;
    price: number;
    condition: any;
    images?: string[];
  },
) => {
  const [newItem] = await db
    .insert(marketplaceItems)
    .values({
      sellerId,
      hostelId,
      ...data,
      status: "AVAILABLE",
    })
    .returning();

  return newItem;
};

export const getAvailableListings = async (hostelId: string) => {
  // Fetch all AVAILABLE items for the user's specific hostel, newest first
  return await db.query.marketplaceItems.findMany({
    where: and(
      eq(marketplaceItems.hostelId, hostelId),
      eq(marketplaceItems.status, "AVAILABLE"),
    ),
    orderBy: [desc(marketplaceItems.createdAt)],
    with: {
      // Fetch the seller's basic info to display on the card
      seller: {
        columns: { name: true, phone: true },
      },
      // Fetch images for the feed
      attachments: {
        columns: { id: true, fileURL: true },
      },
    },
  });
};

// ─── 1b. SELLER DASHBOARD ───

export const getMyListings = async (sellerId: string) => {
  return await db.query.marketplaceItems.findMany({
    where: eq(marketplaceItems.sellerId, sellerId),
    orderBy: [desc(marketplaceItems.createdAt)],
    with: {
      attachments: {
        columns: { id: true, fileURL: true },
      },
      bids: {
        with: {
          buyer: {
            columns: { name: true, phone: true },
          },
        },
        orderBy: [desc(itemBids.createdAt)],
      },
    },
  });
};

export const getBidsForItem = async (sellerId: string, itemId: string) => {
  // Verify the seller owns this item
  const item = await db.query.marketplaceItems.findFirst({
    where: and(
      eq(marketplaceItems.id, itemId),
      eq(marketplaceItems.sellerId, sellerId),
    ),
  });

  if (!item) throw new Error("Item not found or unauthorized.");

  return await db.query.itemBids.findMany({
    where: eq(itemBids.itemId, itemId),
    orderBy: [desc(itemBids.createdAt)],
    with: {
      buyer: {
        columns: { name: true, phone: true },
      },
    },
  });
};

// ─── 1c. BUYER BIDDING HISTORY ───

export const getMyBids = async (buyerId: string) => {
  return await db.query.itemBids.findMany({
    where: eq(itemBids.buyerId, buyerId),
    orderBy: [desc(itemBids.createdAt)],
    with: {
      item: {
        with: {
          seller: {
            columns: { name: true, phone: true },
          },
          attachments: {
            columns: { id: true, fileURL: true },
          },
        },
      },
    },
  });
};

export const deleteListing = async (sellerId: string, itemId: string) => {
  const [item] = await db
    .select()
    .from(marketplaceItems)
    .where(eq(marketplaceItems.id, itemId));

  if (!item || item.sellerId !== sellerId) throw new Error("Unauthorized.");
  if (item.status !== "AVAILABLE")
    throw new Error("Only AVAILABLE items can be deleted.");

  const [cancelled] = await db
    .update(marketplaceItems)
    .set({ status: "CANCELLED" })
    .where(eq(marketplaceItems.id, itemId))
    .returning();

  // Reject any pending bids
  await db
    .update(itemBids)
    .set({ status: "REJECTED" })
    .where(and(eq(itemBids.itemId, itemId), eq(itemBids.status, "PENDING")));

  return cancelled;
};

// ─── 2. THE BIDDING ENGINE ───

export const placeBid = async (
  buyerId: string,
  itemId: string,
  offeredPrice: number,
  message?: string,
) => {
  return await db.transaction(async (tx) => {
    // 1. Verify item exists and is still available
    const [item] = await tx
      .select()
      .from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));

    if (!item) throw new Error("Item not found");
    if (item.status !== "AVAILABLE")
      throw new Error("This item is no longer available.");
    if (item.sellerId === buyerId)
      throw new Error("You cannot bid on your own item.");

    // 2. Check if buyer already has an active bid on this item
    const existingBid = await tx.query.itemBids.findFirst({
      where: and(
        eq(itemBids.itemId, itemId),
        eq(itemBids.buyerId, buyerId),
        eq(itemBids.status, "PENDING"),
      ),
    });

    if (existingBid)
      throw new Error("You already have a pending offer on this item.");

    // 3. Place the bid
    const [newBid] = await tx
      .insert(itemBids)
      .values({
        itemId,
        buyerId,
        offeredPrice,
        message,
        status: "PENDING",
      })
      .returning();

    return newBid;
  });
};

// ─── 3. THE STATE MACHINE (ACCEPT, CONFIRM, CANCEL) ───

export const acceptBid = async (sellerId: string, bidId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch the bid and ensure it belongs to an item owned by the seller
    const bid = await tx.query.itemBids.findFirst({
      where: eq(itemBids.id, bidId),
      with: { item: true },
    });

    if (!bid || bid.item?.sellerId !== sellerId) {
      throw new Error("Unauthorized or invalid bid.");
    }

    if (bid.item?.status !== "AVAILABLE") {
      throw new Error("Item is already pending handover or sold.");
    }

    // 2. Accept this specific bid
    const [acceptedBid] = await tx
      .update(itemBids)
      .set({ status: "ACCEPTED" })
      .where(eq(itemBids.id, bidId))
      .returning();

    // 3. Lock the item from the public feed
    await tx
      .update(marketplaceItems)
      .set({ status: "PENDING_HANDOVER" })
      .where(eq(marketplaceItems.id, bid.itemId));

    // Note: We DO NOT reject other bids yet. If the buyer ghosts,
    // the seller can revert this and the other bids will still be valid.

    return acceptedBid;
  });
};

export const confirmHandover = async (sellerId: string, itemId: string) => {
  return await db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));

    if (!item || item.sellerId !== sellerId) throw new Error("Unauthorized.");
    if (item.status !== "PENDING_HANDOVER")
      throw new Error("Item is not pending handover.");

    // 1. Mark item as officially sold
    const [soldItem] = await tx
      .update(marketplaceItems)
      .set({ status: "SOLD" })
      .where(eq(marketplaceItems.id, itemId))
      .returning();

    // 2. The Ruthless Cleanup: Auto-reject ALL other bids for this item
    await tx
      .update(itemBids)
      .set({ status: "REJECTED" })
      .where(
        and(
          eq(itemBids.itemId, itemId),
          eq(itemBids.status, "PENDING"), // Only reject pending ones, leave the ACCEPTED one alone
        ),
      );

    return soldItem;
  });
};

export const cancelHandover = async (sellerId: string, itemId: string) => {
  return await db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(marketplaceItems)
      .where(eq(marketplaceItems.id, itemId));

    if (!item || item.sellerId !== sellerId) throw new Error("Unauthorized.");
    if (item.status !== "PENDING_HANDOVER")
      throw new Error("Cannot cancel. Item is not pending handover.");

    // 1. Find the currently accepted bid and reject it (Buyer ghosted/changed mind)
    await tx
      .update(itemBids)
      .set({ status: "REJECTED" })
      .where(and(eq(itemBids.itemId, itemId), eq(itemBids.status, "ACCEPTED")));

    // 2. Reactivate the item to the public feed
    const [reactivatedItem] = await tx
      .update(marketplaceItems)
      .set({ status: "AVAILABLE" })
      .where(eq(marketplaceItems.id, itemId))
      .returning();

    return reactivatedItem;
  });
};
