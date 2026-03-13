import { api } from "./api";

export interface AssignedComplaint {
  id: string;
  title: string;
  description: string;
  status:
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "ESCALATED"
    | "REJECTED"
    | "CLOSED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  residentId: string;
  category: string;
  name: string;
  room: string;
  block: string;
  phone: string;
  attachments?: { id: string; fileURL: string }[];
}

export interface StaffProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  specialization: string;
  role: string;
  organization: string;
  hostel: string;
  currentTasks: number;
  createdAt: string;
  isActive: boolean;
}

// 1. Get Assigned Complaints
export const getAssignedComplaints = async (status?: string) => {
  const params = status ? { status } : undefined;
  const response = await api.get("/staff/complaints", { params });
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

// 3. Get Staff Profile
export const getStaffProfile = async (): Promise<StaffProfile> => {
  const response = await api.get<StaffProfile>("/staff/me");
  return response.data;
};

// 4. Update Staff Status
export const updateStaffStatus = async (isActive: boolean) => {
  const response = await api.patch("/staff/status", { isActive });
  return response.data;
};

// 5. Security Profile
export interface SecurityProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  assignedGate: string;
  shift: string;
  role: string;
  organization: string;
  hostel: string;
  isActive: boolean;
}

export const getSecurityProfile = async (): Promise<SecurityProfile> => {
  const response = await api.get<SecurityProfile>("/staff/security/me");
  return response.data;
};
