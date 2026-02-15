import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";

export default function ProfileScreen() {
  const router = useRouter();

  // Dummy Data (Replace with Redux user later if you want)
  const student = {
    name: "Gaurav Daware",
    id: "2022-CS-045",
    branch: "Computer Science",
    year: "Final Year",
    room: "B-304",
    email: "gaurav@college.edu",
    phone: "+91 98765 43210",
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => router.replace("/"), // Go back to Login
      },
    ]);
  };

  const OptionRow = ({ icon, label, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.optionRow}>
      <View style={styles.optionLeft}>
        <View style={[styles.iconBox, isDestructive && styles.iconDestructive]}>
          <Feather
            name={icon}
            size={20}
            color={isDestructive ? "#EF4444" : "#4B5563"}
          />
        </View>
        <Text
          style={[styles.optionText, isDestructive && styles.textDestructive]}
        >
          {label}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Profile</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 1. DIGITAL ID CARD */}
        <View style={styles.idCard}>
          <View style={styles.idHeader}>
            <View style={styles.collegeLogo}>
              <Feather name="award" size={24} color="white" />
            </View>
            <Text style={styles.collegeName}>HABITAT UNIVERSITY</Text>
          </View>

          <View style={styles.idBody}>
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={40} color="#CBD5E1" />
            </View>
            <View style={styles.idDetails}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentId}>{student.id}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{student.branch}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.idFooter}>
            <View>
              <Text style={styles.footerLabel}>ROOM NO</Text>
              <Text style={styles.footerValue}>{student.room}</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>VALID UPTO</Text>
              <Text style={styles.footerValue}>Mar 2026</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>DOB</Text>
              <Text style={styles.footerValue}>01/01/2004</Text>
            </View>
          </View>
        </View>

        {/* 2. PERSONAL INFO SECTION */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{student.email}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{student.phone}</Text>
          </View>
        </View>

        {/* 3. SETTINGS & SUPPORT */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.optionsCard}>
          <OptionRow icon="bell" label="Notifications" />
          <OptionRow icon="lock" label="Change Password" />
          <OptionRow icon="moon" label="Appearance" />
          <OptionRow icon="help-circle" label="Help & Support" />
        </View>

        {/* 4. LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather
            name="log-out"
            size={20}
            color="#EF4444"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>v1.0.0 • Built with ❤️ by Gaurav</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
  },

  // ID Card
  idCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  idHeader: {
    backgroundColor: "#0F172A",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  collegeLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  collegeName: {
    color: "white",
    fontWeight: "bold",
    letterSpacing: 1,
    fontSize: 12,
  },
  idBody: { padding: 20, flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#475569",
  },
  idDetails: { marginLeft: 16 },
  studentName: { color: "white", fontSize: 20, fontWeight: "bold" },
  studentId: { color: "#94A3B8", fontSize: 14, marginTop: 2, marginBottom: 8 },
  badgeRow: { flexDirection: "row" },
  badge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  idFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 0,
  },
  footerLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  footerValue: { color: "white", fontSize: 12, fontWeight: "600" },

  // Info Card
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 12,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: { color: "#64748B", fontWeight: "500" },
  infoValue: { color: "#0F172A", fontWeight: "600" },

  // Options
  optionsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  optionLeft: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconDestructive: { backgroundColor: "#FEE2E2" },
  optionText: { fontSize: 16, fontWeight: "500", color: "#374151" },
  textDestructive: { color: "#EF4444" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: { color: "#EF4444", fontWeight: "bold", fontSize: 16 },
  versionText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },
});
