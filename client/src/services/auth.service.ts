import api from "./api";

export type UserRole = "ADMIN" | "STAFF" | "RESIDENT";

export interface LoggedInUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export const login = async (email: string, password: string) => {
  const response = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", response.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.user));
  return response.data.user as LoggedInUser;
};
