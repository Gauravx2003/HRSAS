import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { TOTP } from "totp-generator";

// 🚨 CRITICAL: This must exactly match the GATE_TOTP_SECRET in your backend .env
const GATE_SECRET = "HABITATHOSTELSUPERSECRETKEY22222";

export default function GatePassScanner() {
  const [qrValue, setQrValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    // 1. Math-based generation (Zero internet required)
    const generateOfflineQr = async () => {
      try {
        // 🚨 Notice we added 'await' and destructured { otp }
        const { otp } = await TOTP.generate(GATE_SECRET, {
          digits: 6,
          period: 10,
        });
        setQrValue(otp);
      } catch (error) {
        console.error("Failed to generate TOTP", error);
      }
    };

    // Generate the first code immediately
    generateOfflineQr();

    // 2. Sync timer with the real-world clock
    const intervalId = setInterval(() => {
      const currentSecond = new Date().getSeconds();
      const remaining = 10 - (currentSecond % 10);

      setTimeLeft(remaining);

      // When the clock hits exactly a 10-second mark, generate the new code
      if (remaining === 10) {
        generateOfflineQr();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gate Attendance</Text>
      <Text style={styles.subTitle}>Scan this to mark In/Out</Text>

      <View style={styles.qrContainer}>
        {!qrValue ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <QRCode
            value={qrValue}
            size={250}
            logo={{
              uri: "https://img.icons8.com/color/48/security-checked.png",
            }}
            logoSize={50}
          />
        )}
      </View>

      {/* Visual Progress Bar or Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>Refreshing in {timeLeft}s...</Text>
        <View
          style={[styles.progressBar, { width: `${(timeLeft / 10) * 100}%` }]}
        />
      </View>

      <Text style={{ textAlign: "center", color: "gray", marginTop: 20 }}>
        Offline Generation Active
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 8,
  },
  subTitle: { fontSize: 16, color: "#64748B", marginBottom: 40 },
  qrContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  timerContainer: { marginTop: 40, width: "60%", alignItems: "center" },
  timerText: { color: "#94A3B8", marginBottom: 10, fontWeight: "600" },
  progressBar: { height: 6, backgroundColor: "#3B82F6", borderRadius: 3 },
});
