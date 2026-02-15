import axios from "axios";
import { store } from "../store/store";

// ⚠️ REPLACE WITH YOUR LAPTOP'S LOCAL IP ADDRESS
// Ensure this matches the one in global constants or index.tsx
// TODO: Move to a shared config file
const API_URL = "http://192.168.31.29:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export { api };
