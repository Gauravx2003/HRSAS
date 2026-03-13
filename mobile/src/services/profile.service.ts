import { api } from "./api";

export interface Profile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  organization: string;
  hostel: string;
  block: string;
  roomNumber: string;
  roomType: string;
  role: string;
  isActive: boolean;
  createdAt?: Date;
  department?: string;
  departmentId?: string;
  enrollmentNumber?: string;
  profilePicUrl?: string;
}

export const getProfile = async (): Promise<Profile> => {
  const response = await api.get<Profile>("/auth/me");
  return response.data;
};
