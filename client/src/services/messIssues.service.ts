import api from "./api";

export const getMyMessIssues = async () => {
  const response = await api.get("/mess-issues/my");
  return response.data;
};

export const createMessIssue = async (
  title: string,
  description: string,
  category: string,
) => {
  const response = await api.post("/mess-issues/create", {
    issueTitle: title,
    issueDescription: description,
    category,
  });
  return response.data;
};
