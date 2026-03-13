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

  // Destructure the NEW response format from backend
  const { user, accessToken, refreshToken } = response.data;

  // Save to Local Storage
  localStorage.setItem("token", accessToken); // Save 'accessToken' as 'token' key
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));

  return {
    user: user as LoggedInUser,
    token: accessToken as string,
    refreshToken: refreshToken as string,
  };
};

export const Logout = async () => {
  // Just make the API call. Let Redux handle the local storage cleanup.
  await api.post("/auth/logout");
};
