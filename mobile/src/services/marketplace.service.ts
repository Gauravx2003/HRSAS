import { api } from "./api";

// ─── TYPES ───

export type ItemCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
export type ItemStatus =
  | "AVAILABLE"
  | "PENDING_HANDOVER"
  | "SOLD"
  | "CANCELLED";
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface MarketplaceItem {
  id: string;
  hostelId: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  condition: ItemCondition;
  status: ItemStatus;
  createdAt: string;
  seller?: { name: string; phone: string };
  attachments?: { id: string; fileURL: string }[];
  bids?: Bid[];
}

export interface Bid {
  id: string;
  itemId: string;
  buyerId: string;
  offeredPrice: number;
  message?: string;
  status: BidStatus;
  createdAt: string;
  buyer?: { name: string; phone: string };
  item?: MarketplaceItem;
}

export interface CreateListingPayload {
  title: string;
  description: string;
  category: string;
  price: number;
  condition: ItemCondition;
}

// ─── API FUNCTIONS ───

// 1. Browse available items
export const getAvailableListings = async (): Promise<MarketplaceItem[]> => {
  const response = await api.get("/marketplace/items");
  return response.data;
};

// 2. Create a new listing
export const createListing = async (payload: CreateListingPayload) => {
  const response = await api.post("/marketplace/items", payload);
  return response.data;
};

// 3. Upload images for an item
export const uploadItemImages = async (itemId: string, imageUris: string[]) => {
  const formData = new FormData();
  imageUris.forEach((uri, idx) => {
    const filename = uri.split("/").pop() || `image_${idx}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    formData.append("images", {
      uri,
      name: filename,
      type,
    } as any);
  });

  const response = await api.post(
    `/marketplace/${itemId}/attachments`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

// 4. Get my listings (seller dashboard)
export const getMyListings = async (): Promise<MarketplaceItem[]> => {
  const response = await api.get("/marketplace/my");
  return response.data;
};

// 5. Get bids for a specific item
export const getBidsForItem = async (itemId: string): Promise<Bid[]> => {
  const response = await api.get(`/marketplace/items/${itemId}/bids`);
  return response.data;
};

// 6. Place a bid on an item
export const placeBid = async (
  itemId: string,
  offeredPrice: number,
  message?: string,
) => {
  const response = await api.post(`/marketplace/items/${itemId}/bids`, {
    offeredPrice,
    message,
  });
  return response.data;
};

// 7. Accept a bid (seller)
export const acceptBid = async (bidId: string) => {
  const response = await api.post(`/marketplace/bids/${bidId}/accept`);
  return response.data;
};

// 8. Confirm handover (seller)
export const confirmHandover = async (itemId: string) => {
  const response = await api.post(`/marketplace/items/${itemId}/confirm`);
  return response.data;
};

// 9. Cancel handover (seller)
export const cancelHandover = async (itemId: string) => {
  const response = await api.post(`/marketplace/items/${itemId}/cancel`);
  return response.data;
};

// 10. Delete/cancel listing (seller)
export const deleteListing = async (itemId: string) => {
  const response = await api.delete(`/marketplace/items/${itemId}`);
  return response.data;
};

// 11. Get my bids (buyer history)
export const getMyBids = async (): Promise<Bid[]> => {
  const response = await api.get("/marketplace/my/bids");
  return response.data;
};
