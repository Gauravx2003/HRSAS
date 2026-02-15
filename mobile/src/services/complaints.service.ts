import { api } from "./api";

// Types based on backend Controller & Routes
export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  categoryId: string;
  categoryName: string; // Joined from backend
  createdAt: string;
  updatedAt: string;
  roomId: string;
  residentId: string;
  staffName?: string;
}

export interface ComplaintCategory {
  id: string;
  name: string;
  description?: string;
  slaHours: number;
}

export interface CreateComplaintPayload {
  roomId: string;
  categoryId: string;
  title: string;
  description: string;
}

// 1. Get Complaint Categories
export const getComplaintCategories = async (): Promise<
  ComplaintCategory[]
> => {
  const response = await api.get("/complaints/categories");
  return response.data;
};

// 2. Get My Complaints
export const getMyComplaints = async (): Promise<Complaint[]> => {
  const response = await api.get("/complaints/my");
  return response.data;
};

// 3. Raise a Complaint
export const raiseComplaint = async (
  payload: CreateComplaintPayload,
): Promise<Complaint> => {
  const response = await api.post("/complaints", payload);
  return response.data;
};
