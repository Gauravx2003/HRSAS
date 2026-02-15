import { api } from "./api";

export interface GatePassRequest {
  id: string;
  type: "ENTRY" | "EXIT" | "OVERNIGHT";
  reason: string;
  location: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "CLOSED" | "EXPIRED";
  outTime: string;
  inTime: string;
  qrToken?: string;
  createdAt: string;
}

export interface CreateGatePassPayload {
  type: "ENTRY" | "EXIT" | "OVERNIGHT";
  reason: string;
  location: string;
  outTime?: string;
  inTime?: string;
}

// 1. Get My Gate Passes
export const getMyPasses = async (): Promise<GatePassRequest[]> => {
  const response = await api.get("/gate-pass/my");
  return response.data;
};

// 2. Create a Gate Pass Request
export const createGatePass = async (
  payload: CreateGatePassPayload,
): Promise<GatePassRequest> => {
  const response = await api.post("/gate-pass/create", payload);
  return response.data.request;
};
