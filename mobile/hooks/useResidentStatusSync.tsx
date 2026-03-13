import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import * as SecureStore from "expo-secure-store";
import { getProfile } from "@/src/services/profile.service";
// Adjust this import to match your Redux setup!
import { updateUser } from "@/src/store/authSlice";

export function useResidentStatusSync() {
  const dispatch = useDispatch();
  // Get current user from Redux
  const user = useSelector((state: any) => state.auth.user);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;

    // 1. The silent fetch functionu
    const fetchLatestStatus = async () => {
      try {
        // Assuming you have an endpoint that returns the user's profile
        // If not, you can create a fast GET /api/users/status endpoint
        const response = await getProfile();
        const serverIsActive = response.isActive;

        // 2. Only update Redux and Storage if the server's truth is different from local state
        if (serverIsActive !== user.isActive) {
          console.log(
            `🔄 Status auto-corrected from ${user.isActive} to ${serverIsActive}`,
          );

          const updatedUser = { ...user, isActive: serverIsActive };
          dispatch(updateUser(updatedUser));
          await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));
        }
      } catch (error) {
        // Silently ignore. If they are offline, we just keep showing the last known Redux state.
      }
    };

    // Trigger A: Fetch immediately when the dashboard mounts
    fetchLatestStatus();

    // Trigger B: Fetch whenever the app is brought back from the background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        fetchLatestStatus();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [user?.isActive]);
}
