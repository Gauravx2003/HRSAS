// auth.service.ts
import { api } from "./api";

// Define the Login Response Type
interface LoginResponse {
  user: any;
  accessToken: string; // Matches backend
  refreshToken: string; // Matches backend
  offlineToken?: string;
}

interface Credentials {
  email: string;
  password: string;
}

export const authService = {
  login: async (credentials: Credentials) => {
    // The backend now returns { user, accessToken, refreshToken }
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  logout: async () => {
    return await api.post("/auth/logout");
  },
};
