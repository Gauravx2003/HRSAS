import React from "react";
import { Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { VisitorVerificationList } from "../../components/visitors/VisitorVerificationList";

export default function SecurityVisitorsTab() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#1E1B4B", "#312E81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Today's Visitors</Text>
        <Text style={styles.headerSub}>Verify & manage visitor access</Text>
      </LinearGradient>
      <VisitorVerificationList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  content: {
    padding: 20,
    gap: 20,
  },
});
