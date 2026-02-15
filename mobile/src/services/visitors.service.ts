import { api } from "./api";

export interface VisitorRequest {
  id: string;
  visitorName: string;
  visitorPhone: string;
  relation: string;
  purpose: string;
  visitDate: string;
  entryCode: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
}

export const visitorsService = {
  createRequest: async (data: {
    visitorName: string;
    visitorPhone: string;
    relation: string;
    purpose: string;
    visitDate: string;
  }) => {
    const response = await api.post("/visitors/create", data);
    return response.data;
  },

  getMyRequests: async () => {
    const response = await api.get<VisitorRequest[]>("/visitors/my-requests");
    return response.data;
  },
};
