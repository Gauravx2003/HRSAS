import { api } from "./api";

export interface AssignedComplaint {
  id: string;
  description: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED" | "REJECTED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  residentId: string;
  category: string;
  location?: string; // If available
}

// 1. Get Assigned Complaints
export const getAssignedComplaints = async () => {
  const response = await api.get("/staff/complaints");
  return response.data;
};

// 2. Update Complaint Status
export const updateComplaintStatus = async (
  id: string,
  status: "IN_PROGRESS" | "RESOLVED",
) => {
  const response = await api.patch(`/staff/complaints/${id}/status`, {
    status,
  });
  return response.data;
};
