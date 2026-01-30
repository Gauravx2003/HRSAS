import api from "./api";

export type UserRole = "ADMIN" | "STAFF" | "RESIDENT";

export interface LoggedInUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  roomNumber?: string;
  roomId?: string;
  blockName?: string;
  blockId?: string;
  organizationId?: string;
}

export const login = async (email: string, password: string) => {
  const response = await api.post("/auth/login", { email, password });
  console.log("response ", response);
  localStorage.setItem("token", response.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.user));
  return {
    user: response.data.user as LoggedInUser,
    token: response.data.token as string,
  };
};
