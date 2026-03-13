import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { Feather } from "@expo/vector-icons";

// Define what's inside the Resident's QR Code
interface DecodedStudent {
  userId: string;
  name: string;
  room: string;
  block: string;
}

export default function GuardOfflineScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedStudent, setScannedStudent] = useState<DecodedStudent | null>(
    null,
  );

  const handleScan = ({ data }: any) => {
    if (scannedStudent) return; // Prevent double scans

    try {
      // Decode the JWT from the QR code (No internet required!)
      const decoded = jwtDecode<DecodedStudent>(data);
      if (!decoded.userId || !decoded.name) throw new Error("Invalid Format");

      setScannedStudent(decoded); // Triggers the Visual Verification UI
    } catch (error) {
      Alert.alert("Invalid QR", "This is not a valid Hostel ID.");
    }
  };

  const queueAttendance = async (direction: "IN" | "OUT") => {
    if (!scannedStudent) return;

    try {
      // 1. Create the offline log object
      const newLog = {
        userId: scannedStudent.userId,
        direction: direction,
        scannedAt: new Date().toISOString(), // 🚨 CRITICAL: The exact time of scan
      };

      // 2. Fetch the existing queue from the tablet's hard drive
      const existingQueueStr = await AsyncStorage.getItem(
        "offlineAttendanceQueue",
      );
      const queue = existingQueueStr ? JSON.parse(existingQueueStr) : [];

      // 3. Add the new log and save it back
      queue.push(newLog);
      await AsyncStorage.setItem(
        "offlineAttendanceQueue",
        JSON.stringify(queue),
      );

      Alert.alert(
        "Saved Locally 💾",
        `${scannedStudent.name} marked ${direction}. Will sync when online.`,
      );

      // Reset scanner for the next student
      setScannedStudent(null);
    } catch (error) {
      console.log(error);
      Alert.alert("Storage Error", "Failed to save locally.");
    }
  };

  if (!permission?.granted) return <Text>Need camera access</Text>;

  return (
    <View style={styles.container}>
      {/* 🚨 CONDITIONAL UI: If a student is scanned, show Visual Verification */}
      {scannedStudent ? (
        <View style={styles.verificationCard}>
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={60} color="#9CA3AF" />
          </View>
          <Text style={styles.studentName}>{scannedStudent.name}</Text>
          <Text style={styles.roomText}>Room: {scannedStudent.room}</Text>
          <Text style={styles.roomText}>Block: {scannedStudent.block}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#10B981" }]}
              onPress={() => queueAttendance("IN")}
            >
              <Text style={styles.btnText}>MARK IN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#EF4444" }]}
              onPress={() => queueAttendance("OUT")}
            >
              <Text style={styles.btnText}>MARK OUT</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setScannedStudent(null)}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: "#6B7280" }}>Cancel / Rescan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // 🚨 Default UI: The Camera
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleScan}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        >
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>
              OFFLINE MODE: Scan Student ID
            </Text>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  verificationCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  studentName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  roomText: {
    fontSize: 18,
    color: "#94A3B8",
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 20,
  },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 3,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
