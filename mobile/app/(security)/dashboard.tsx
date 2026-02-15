import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, Camera } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/services/api";

export default function SecurityDashboard() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false); // New State to control Camera
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    message: string;
    mode: "IN" | "OUT";
    type?: string;
  } | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      // Call Backend Scan API
      const response = await api.post("/gate-pass/scan", { qrToken: data });
      const result = response.data;
      setScanResult(result);
      setIsScanning(false); // Close camera on success
    } catch (error: any) {
      console.error("Scan Failed:", error);
      Alert.alert(
        "Scan Failed",
        error.response?.data?.message || "Invalid QR Code",
        [{ text: "OK", onPress: () => setScanned(false) }], // Allow retry
      );
    } finally {
      setLoading(false);
    }
  };

  const startScan = () => {
    setScanned(false);
    setScanResult(null);
    setIsScanning(true);
  };

  const closeScanner = () => {
    setIsScanning(false);
    setScanned(false);
  };

  const scanNext = () => {
    setScanResult(null);
    setScanned(false);
    setIsScanning(true);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "white" }}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>No access to camera</Text>
        <TouchableOpacity
          onPress={() => Camera.requestCameraPermissionsAsync()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: "#4ADE80" }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 1. RESULT SCREEN
  if (scanResult) {
    return (
      <SafeAreaView style={[styles.container, styles.bgSuccess]}>
        <View style={styles.resultCard}>
          <Feather name="check-circle" size={80} color="white" />
          <Text style={styles.resultTitle}>{scanResult.message}</Text>
          <Text style={styles.resultSub}>
            {scanResult.mode === "IN"
              ? "Student has Entered"
              : "Student has Left"}
          </Text>
          {scanResult.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{scanResult.type}</Text>
            </View>
          )}

          <View style={{ width: "100%", gap: 16 }}>
            <TouchableOpacity style={styles.resetBtn} onPress={scanNext}>
              <Text style={styles.resetText}>Scan Next</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: "rgba(0,0,0,0.2)" }]}
              onPress={() => setScanResult(null)}
            >
              <Text style={[styles.resetText, { color: "white" }]}>
                Back to Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. SCANNER SCREEN
  if (isScanning) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={closeScanner} style={styles.closeBtn}>
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scanning...</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scannerContainer}>
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>Align QR code within frame</Text>
          </View>

          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="white" />
              <Text style={{ color: "white", marginTop: 10 }}>
                Verifying...
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 3. DASHBOARD (LANDING)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Guard</Text>
        <Text style={styles.headerSub}>Campus Gate Control</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
          <View style={styles.iconCircle}>
            <Feather name="maximize" size={32} color="#0F172A" />
          </View>
          <Text style={styles.scanBtnText}>Scan QR Code</Text>
          <Text style={styles.scanBtnSub}>Tap to scan student gate pass</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Dashboard Landing
  header: {
    paddingVertical: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 16,
    color: "#94A3B8",
  },
  actionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  scanBtn: {
    backgroundColor: "#2563EB",
    width: "100%",
    maxWidth: 300,
    aspectRatio: 1,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scanBtnText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  scanBtnSub: {
    color: "#BFDBFE",
    fontSize: 14,
    textAlign: "center",
  },

  // Scanner View
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  scannerContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    backgroundColor: "black",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#4ADE80",
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  scanText: {
    color: "white",
    marginTop: 24,
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Result
  bgSuccess: { backgroundColor: "#15803D" },
  resultCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginTop: 24,
    textAlign: "center",
  },
  resultSub: {
    fontSize: 20,
    color: "#BBF7D0",
    marginTop: 12,
    marginBottom: 32,
    textAlign: "center",
  },
  typeBadge: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    marginBottom: 60,
    shadowColor: "black",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  typeText: {
    color: "#15803D",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 1,
  },
  resetBtn: {
    backgroundColor: "white",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
  },
  resetText: {
    color: "#15803D",
    fontSize: 18,
    fontWeight: "bold",
  },
});
