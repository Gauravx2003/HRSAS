import api from "./api";

export const createResident = async (
  adminUser: {
    hostelId: string;
    organizationId: string;
  },
  residentData: {
    name: string;
    email: string;
    roomId: string;
    enrollmentNumber?: string;
  },
) => {
  const response = await api.post("/user-creation/resident", {
    adminUser,
    residentData,
  });
  return response.data;
};

export const createStaff = async (
  adminUser: {
    hostelId: string;
    organizationId: string;
  },
  staffData: {
    name: string;
    email: string;
    staffType: "IN_HOUSE" | "VENDOR";
    specialization: string;
  },
) => {
  const response = await api.post("/user-creation/staff", {
    adminUser,
    staffData,
  });
  return response.data;
};

export const getHostelBlocks = async (hostelId: string) => {
  const response = await api.get(`/user-creation/hostelBlocks/${hostelId}`);
  return response.data;
};

export const getBlockRooms = async (blockId: string) => {
  const response = await api.get(`/user-creation/blockRooms/${blockId}`);
  return response.data;
};

export const getRoomResidents = async (roomId: string) => {
  const response = await api.get(`/user-creation/roomResidents/${roomId}`);
  return response.data;
};
