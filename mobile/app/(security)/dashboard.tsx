import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect, useRouter } from "expo-router";
// @ts-ignore
import { RootState } from "../../src/store/store";
import { logout } from "../../src/store/authSlice";
import { api } from "../../src/services/api";
import { getResidentStats } from "../../src/services/attendance.service";
import { DashboardHeader } from "../../components/DashboardHeader";
import {
  ProfileMenuModal,
  MenuOption,
} from "../../components/ProfileMenuModal";
import { UniversalScanner } from "../../components/UniversalScanner";

export default function SecurityDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const userName = user?.name || "Security";

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Stats ---
  const [stats, setStats] = useState({
    totalResidents: 0,
    insideCount: 0,
    outsideCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // --- Camera ---
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [isScanning, setIsScanning] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getResidentStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch resident stats", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // refresh every 10s
      return () => clearInterval(interval);
    }, [fetchStats]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          dispatch(logout());
          router.replace("/");
        },
      },
    ]);
  };

  const menuOptions: MenuOption[] = [
    {
      label: "My Profile",
      icon: "user",
      color: "#2563EB",
      bg: "#EFF6FF",
      onPress: () => {
        setMenuVisible(false);
        router.push("/(security)/profile" as any);
      },
    },
    {
      label: "Notifications",
      icon: "bell",
      color: "#EA580C",
      bg: "#FFF7ED",
      onPress: () => {
        setMenuVisible(false);
        Alert.alert(
          "Coming Soon",
          "Notification settings will be available soon.",
        );
      },
    },
    {
      label: "Appearance",
      icon: "sun",
      color: "#0891B2",
      bg: "#ECFEFF",
      onPress: () => {
        setMenuVisible(false);
        Alert.alert(
          "Coming Soon",
          "Appearance settings will be available soon.",
        );
      },
    },
  ];

  const startScan = () => {
    setIsScanning(true);
  };

  const closeScanner = () => {
    setIsScanning(false);
    // Refresh stats after a scan since a resident may have checked in/out
    fetchStats();
  };

  // ─── PERMISSION SCREENS ───────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#94A3B8" }}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: "#94A3B8" }}>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission} style={{ marginTop: 20 }}>
          <Text style={{ color: "#4ADE80" }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── 2. SCANNER SCREEN ────────────────────────────────────
  if (isScanning) {
    return <UniversalScanner isFocused={isFocused} onClose={closeScanner} />;
  }

  // ─── Helper: format time ───
  const currentHour = new Date().getHours();
  const isCurfewTime = currentHour >= 20 || currentHour < 6; // 8 PM to 6 AM

  // ─── 3. DASHBOARD (LANDING) ───────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <DashboardHeader
          userName={userName}
          onAvatarPress={() => setMenuVisible(true)}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* SHIFT BADGE */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftLeft}>
            <View style={styles.shiftDot} />
            <Text style={styles.shiftText}>On Duty • Gate Control</Text>
          </View>
          <View style={styles.shiftBadge}>
            <Feather name="shield" size={14} color="#2563EB" />
            <Text style={styles.shiftBadgeText}>SECURITY</Text>
          </View>
        </View>

        {/* ── RESIDENT STATS ── */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>Hostel Occupancy</Text>
          <Text style={styles.statsSectionSub}>
            {stats.totalResidents} Total Residents
          </Text>

          <View style={styles.statsRow}>
            {/* INSIDE CARD */}
            <View style={[styles.statCard, styles.statCardInside]}>
              <View style={styles.statIconCircle}>
                <Feather name="home" size={20} color="#16A34A" />
              </View>
              {statsLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#16A34A"
                  style={{ marginTop: 12 }}
                />
              ) : (
                <Text style={[styles.statNumber, { color: "#16A34A" }]}>
                  {stats.insideCount}
                </Text>
              )}
              <Text style={styles.statLabel}>Inside</Text>
            </View>

            {/* OUTSIDE CARD — emphasized */}
            <View
              style={[
                styles.statCard,
                styles.statCardOutside,
                isCurfewTime && stats.outsideCount > 0 && styles.statCardAlert,
              ]}
            >
              <View
                style={[
                  styles.statIconCircle,
                  { backgroundColor: "rgba(239,68,68,0.12)" },
                ]}
              >
                <Feather name="log-out" size={20} color="#EF4444" />
              </View>
              {statsLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#EF4444"
                  style={{ marginTop: 12 }}
                />
              ) : (
                <Text style={[styles.statNumber, { color: "#EF4444" }]}>
                  {stats.outsideCount}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: "#6B7280" }]}>
                Outside
              </Text>
              {isCurfewTime && stats.outsideCount > 0 && (
                <View style={styles.alertBadge}>
                  <Feather name="alert-circle" size={10} color="#fff" />
                  <Text style={styles.alertBadgeText}>CURFEW</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* VIEW RESIDENTS OUTSIDE BUTTON */}
        <TouchableOpacity
          style={styles.residentsBtn}
          onPress={() => router.push("/(security)/residents-outside" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.residentsBtnLeft}>
            <View style={styles.residentsBtnIcon}>
              <Feather name="users" size={22} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.residentsBtnText}>Residents Outside</Text>
              <Text style={styles.residentsBtnSub}>
                View list & contact info
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>

        {/* SCAN BUTTON */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
            <View style={styles.iconCircle}>
              <Feather name="maximize" size={26} color="#0F172A" />
            </View>
            <View>
              <Text style={styles.scanBtnText}>Scan QR Code</Text>
              <Text style={styles.scanBtnSub}>
                Tap to scan student gate pass
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PROFILE MENU */}
      <ProfileMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        userName={userName}
        userEmail={user?.email}
        menuOptions={menuOptions}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Shift Card
  shiftCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  shiftLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ADE80",
    marginRight: 10,
  },
  shiftText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14,
  },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37,99,235,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  shiftBadgeText: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // ── Stats Section ──
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  statsSectionSub: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardInside: {
    borderColor: "rgba(22,163,74,0.15)",
  },
  statCardOutside: {
    borderColor: "rgba(239,68,68,0.15)",
  },
  statCardAlert: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(22,163,74,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 36,
    fontWeight: "800",
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  alertBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Residents Outside Button
  residentsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  residentsBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  residentsBtnIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  residentsBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  residentsBtnSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
    fontWeight: "500",
  },

  // Scan Button
  actionContainer: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  scanBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  scanBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  scanBtnSub: {
    color: "#BFDBFE",
    fontSize: 13,
    marginTop: 2,
  },
});
