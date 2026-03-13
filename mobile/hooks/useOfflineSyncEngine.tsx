import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/src/services/api";

export function useOfflineSyncEngine() {
  const appState = useRef(AppState.currentState);
  // 🚨 THE LOCK: Prevents multiple API calls from firing at the same time
  const isSyncing = useRef(false);

  useEffect(() => {
    // 1. Extract the sync logic into a standalone function
    const triggerSync = async () => {
      // 🚨 If already syncing, stop!
      if (isSyncing.current) return;

      try {
        // Double-check the current network state manually
        const network = await NetInfo.fetch();
        if (!network.isConnected) return;

        const queueStr = await AsyncStorage.getItem("offlineAttendanceQueue");
        if (!queueStr) return;

        const records = JSON.parse(queueStr);
        if (records.length === 0) return;

        // 🚨 Lock the engine
        isSyncing.current = true;
        console.log(`📡 Syncing ${records.length} offline logs...`);

        const response = await api.post("/attendance/sync-offline", {
          records,
        });

        if (response.status === 201) {
          console.log("✅ Sync complete. Clearing local queue.");
          await AsyncStorage.removeItem("offlineAttendanceQueue");
        }
      } catch (error) {
        console.error("Failed to sync offline queue", error);
      } finally {
        // 🚨 Unlock the engine
        isSyncing.current = false;
      }
    };

    // Trigger A: Listen for actual Wi-Fi/4G hardware changes
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      // We drop isInternetReachable here because it is notoriously buggy on Android
      if (state.isConnected) {
        triggerSync();
      }
    });

    // Trigger B: Listen for the app coming back to the foreground
    // (e.g., after the guard pulls down the notification shade to turn on Wi-Fi)
    const unsubscribeApp = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          triggerSync();
        }
        appState.current = nextAppState;
      },
    );

    // Trigger C: Run once immediately when the layout mounts
    triggerSync();

    // Cleanup listeners when the app closes
    return () => {
      unsubscribeNet();
      unsubscribeApp.remove();
    };
  }, []);
}
