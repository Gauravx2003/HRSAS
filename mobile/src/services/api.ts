import axios from "axios";
import { store } from "../store/store";
import { logout, updateAccessToken } from "../store/authSlice";
import * as SecureStore from "expo-secure-store"; // <-- 1. Import SecureStore

// ⚠️ REPLACE WITH YOUR LAPTOP'S LOCAL IP ADDRESS
// Ensure this matches the one in global constants or index.tsx
// TODO: Move to a shared config file
const API_URL = "http://10.150.151.87:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    // We can safely read from Redux here because _layout.tsx ensures
    // Redux is populated from SecureStore before the app even renders.
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried to prevent infinite loop

      try {
        // Get the Refresh Token from Redux
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;

        if (!refreshToken) {
          // No refresh token? Wipe hard drive and force logout.
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
          await SecureStore.deleteItemAsync("user");
          store.dispatch(logout());
          return Promise.reject(error);
        }

        // Call Backend to get new Access Token
        // NOTE: Use raw 'axios' here, not 'api' instance, to avoid circular interceptors
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken, // Send in the body (matches your backend auth.service.ts)
        });

        const newAccessToken = response.data.accessToken;

        // 1. Save new token to Redux for immediate UI use
        store.dispatch(updateAccessToken(newAccessToken));

        // 2. Save new token to SecureStore so it survives app restarts
        await SecureStore.setItemAsync("accessToken", newAccessToken);

        // 3. Update the header for the original failed request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 4. Retry the original request silently
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is invalid or expired?
        console.log("Session expired completely. Logging out.");

        // Wipe everything from the device and Redux
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        await SecureStore.deleteItemAsync("user");
        store.dispatch(logout());

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export { api };
