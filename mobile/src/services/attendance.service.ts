import { api } from "./api";

export const generateQr = async () => {
  const response = await api.get("/attendance/generate-qr");
  return response.data;
};

export const markAttendance = async (qrData: string) => {
  const response = await api.post("/attendance/verify-qr", { token: qrData });
  return response.data;
};

export const getResidentStats = async () => {
  const response = await api.get("/attendance/resident-stats");
  return response.data;
};

export const getResidentsOutside = async () => {
  const response = await api.get("/attendance/residents-outside");
  return response.data;
};
