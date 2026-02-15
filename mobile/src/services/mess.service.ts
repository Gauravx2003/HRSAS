import { api } from "./api";

export interface MessIssue {
  id: string;
  issueTitle: string;
  issueDescription: string;
  category: "FOOD" | "SERVICE" | "HYGIENE" | "INFRASTRUCTURE" | "OTHER";
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  adminResponse?: string;
  createdAt: string;
}

export const messService = {
  createIssue: async (data: {
    issueTitle: string;
    issueDescription: string;
    category: string;
  }) => {
    const response = await api.post("/mess-issues/create", data);
    return response.data;
  },

  getMyIssues: async () => {
    const response = await api.get<MessIssue[]>("/mess-issues/my");
    return response.data;
  },
};
