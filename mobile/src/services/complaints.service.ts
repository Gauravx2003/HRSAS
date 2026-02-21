import { api } from "./api";

// Types based on backend Controller & Routes
export interface Complaint {
  id: string;
  title: string;
  description: string;
  status:
    | "CREATED"
    | "ASSIGNED"
    | "PENDING"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "CLOSED"
    | "REJECTED"
    | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  categoryId: string;
  categoryName: string; // Joined from backend
  createdAt: string;
  updatedAt: string;
  roomId: string;
  residentId: string;
  staffName?: string;
  attachments?: { id: string; fileURL: string }[];
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

// 4. Close a Resolved Complaint (Resident accepts the resolution)
export const closeComplaint = async (complaintId: string) => {
  const response = await api.patch(`/complaints/${complaintId}/close`);
  return response.data;
};

// 5. Reject a Resolution (Resident is not satisfied → Escalates to Admin)
export const rejectResolution = async (complaintId: string, reason: string) => {
  const response = await api.patch(`/complaints/${complaintId}/reject`, {
    reason,
  });
  return response.data;
};

// 6. Get Complaint Status History
export interface StatusHistoryEntry {
  id: string;
  complaintId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
}

export const getComplaintHistory = async (
  complaintId: string,
): Promise<StatusHistoryEntry[]> => {
  const response = await api.get(`/complaints/${complaintId}/history`);
  return response.data;
};

// 7. Upload Complaint Attachments
export const uploadComplaintAttachments = async (
  complaintId: string,
  imageUris: string[],
) => {
  const formData = new FormData();
  imageUris.forEach((uri, index) => {
    formData.append("images", {
      uri,
      name: `complaint_image_${index}.jpg`,
      type: "image/jpeg",
    } as any);
  });

  const response = await api.post(
    `/complaints/${complaintId}/attachments`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};
