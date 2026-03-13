import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as SecureStore from "expo-secure-store";

export default function OfflineIdScreen() {
  const [offlineToken, setOfflineToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the signed JWT that was saved during the initial login
    const loadToken = async () => {
      const token = await SecureStore.getItemAsync("offlineIdToken");
      setOfflineToken(token);
    };
    loadToken();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline ID Card</Text>
      <Text style={styles.subTitle}>
        Show this to the guard if the internet is down
      </Text>

      <View style={styles.qrContainer}>
        {offlineToken ? (
          <QRCode value={offlineToken} size={250} />
        ) : (
          <Text style={{ color: "white" }}>
            No Offline ID found. Please login while online.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A", // Dark background to make the QR pop
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 40,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
});
