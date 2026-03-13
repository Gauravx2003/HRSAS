import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRouter, useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { markAttendance } from "@/src/services/attendance.service";
import { RootState } from "@/src/store/store";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "@/src/store/authSlice";
import * as SecureStore from "expo-secure-store";

export default function AttendanceScanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const isFocused = useIsFocused();

  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (isFocused) {
      setScanned(false);
      setLoading(false);
    }
  }, [isFocused]);

  useEffect(() => {
    // 1. Prefetch Location for speed
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location to mark attendance.");
        return;
      }

      // Get location immediately so it's ready when they scan
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
    })();
  }, []);

  if (!permission) {
    // Instead of returning empty View, verify permission again
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 100 }}
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 100, color: "white" }}>
          We need camera access
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned || loading) return; // Prevent double scans

    setScanned(true);
    setLoading(true);
    Vibration.vibrate(); // Haptic feedback

    try {
      if (!location) {
        // Try fetching again if initial fetch failed
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);
      }

      console.log(`Scanned: ${data}`);

      // 1. Send to Backend
      const response = await markAttendance(data);
      const message = response.data.message;

      // 2. Determine the new status from the backend message
      const isNowInside = message.includes("IN");

      // 3. Update Redux globally
      if (user) {
        const updatedUser = { ...user, isActive: isNowInside };
        dispatch(updateUser(updatedUser));

        // 4. Keep local storage in sync so it survives app restarts
        await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));
      }

      // 5. Success UI
      Alert.alert(
        "Attendance Marked! ✅",
        response.data.message ||
          `Successfully marked ${response.data.direction}`,
        [{ text: "OK", onPress: () => router.push("/dashboard") }],
      );
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || "Invalid or Expired QR";

      Alert.alert("Scan Failed ❌", errMsg, [
        {
          text: "Try Again",
          onPress: () => {
            setScanned(false);
            setLoading(false);
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Gate QR</Text>
      </View>

      {/* CRITICAL FIX: Only render CameraView if screen is FOCUSED */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          {/* ... Overlay UI ... */}
          <View style={styles.overlay}>
            <View style={styles.topOverlay}>
              <Text style={styles.instructionText}>
                Align the Gate QR code within the frame
              </Text>
            </View>

            <View style={styles.middleOverlay}>
              <View style={styles.sideOverlay} />
              <View style={styles.focusedFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                {loading && <ActivityIndicator size="large" color="#4ADE80" />}
              </View>
              <View style={styles.sideOverlay} />
            </View>

            <View style={styles.bottomOverlay}>
              {location ? (
                <View style={styles.locBadge}>
                  <Feather name="map-pin" size={14} color="#4ADE80" />
                  <Text style={styles.locText}>Location Active</Text>
                </View>
              ) : (
                <View style={[styles.locBadge, { backgroundColor: "#EF4444" }]}>
                  <Feather name="alert-circle" size={14} color="white" />
                  <Text style={[styles.locText, { color: "white" }]}>
                    Fetching GPS...
                  </Text>
                </View>
              )}
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  header: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  btn: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: "center",
  },
  btnText: { color: "white", fontWeight: "bold" },

  // Camera Overlay
  overlay: { flex: 1, backgroundColor: "transparent" },
  topOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  middleOverlay: { flexDirection: "row", height: 280 },
  sideOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  focusedFrame: {
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    paddingTop: 40,
  },
  instructionText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    width: "80%",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#4ADE80",
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  locBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  locText: { color: "#4ADE80", fontWeight: "600", fontSize: 12, marginLeft: 6 },
});
