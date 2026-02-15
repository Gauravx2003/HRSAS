import { api } from "./api";

export interface LostItem {
  id: string;
  title: string;
  description: string;
  category: string; // e.g., Electronics, Wallet, etc.
  location: string;
  dateLost: string; // ISO Date
  status: "OPEN" | "FOUND" | "CLAIMED" | "CLOSED";
  createdAt: string;
  images?: string[]; // Array of image URLs
}

export interface FoundItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  dateFound: string;
  status: "OPEN" | "CLAIMED" | "CLOSED";
  createdAt: string;
  images?: string[];
}

export interface CreateLostItemPayload {
  title: string;
  description: string;
  category: string;
  lostLocation: string;
  lostDate: string;
  // images?
}

// 1. Report a Lost Item
export const reportLostItem = async (payload: CreateLostItemPayload) => {
  const response = await api.post("/lost-and-found/create", payload);
  return response.data;
};

// 2. Get My Reported Items (Lost & Found/Claimed by me)
export const getMyLostItems = async () => {
  const response = await api.get("/lost-and-found/my");
  return response.data; // Returns array of items
};

// 3. Get All Found Items (Public Feed)
export const getFoundItems = async () => {
  const response = await api.get("/lost-and-found/found");
  return response.data;
};

// 4. Claim a Found Item
export const claimItem = async (id: string) => {
  const response = await api.patch(`/lost-and-found/${id}/claim`);
  return response.data;
};
