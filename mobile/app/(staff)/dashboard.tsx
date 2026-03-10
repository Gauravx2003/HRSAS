import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

// @ts-ignore
import { RootState } from "../../src/store/store";
import { logout } from "../../src/store/authSlice";
import {
  getAssignedComplaints,
  AssignedComplaint,
  getStaffProfile,
  updateStaffStatus,
} from "../../src/services/staff.service";
import { DashboardHeader } from "../../components/DashboardHeader";
import {
  ProfileMenuModal,
  MenuOption,
} from "../../components/ProfileMenuModal";
import { UniversalScanner } from "../../components/UniversalScanner";
import { useCameraPermissions } from "expo-camera";
import { authService } from "@/src/services/auth.service";
import * as SecureStore from "expo-secure-store";

const AnimatedNumber = ({ target, style }: { target: number; style: any }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;

    const totalDuration = 1500;
    const increment = Math.ceil(end / (totalDuration / 16));

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return <Text style={style}>{count.toLocaleString()}</Text>;
};

const StatBox = ({
  value,
  label,
  highlight = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: highlight ? "#EEF2FF" : "white",
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: highlight ? 2 : 0,
      borderColor: highlight ? "#4F46E5" : "transparent",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      elevation: 2,
    }}
  >
    <AnimatedNumber
      target={value}
      style={{
        fontSize: 28,
        fontWeight: "bold",
        color: highlight ? "#4F46E5" : "#111827",
      }}
    />

    <Text
      style={{
        fontSize: 10,
        color: "#6B7280",
        fontWeight: "600",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Text>
  </View>
);

export default function StaffDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const userName = user?.name || "Staff Member";

  const [menuVisible, setMenuVisible] = useState(false);
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // Scanner State
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const startScan = () => {
    if (!permission?.granted) {
      requestPermission();
    } else {
      setIsScanning(true);
    }
  };

  const closeScanner = () => setIsScanning(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [complaintsData, profileData] = await Promise.all([
        getAssignedComplaints(),
        getStaffProfile(),
      ]);
      setComplaints(complaintsData);
      setIsActive(profileData.isActive);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    try {
      setStatusLoading(true);
      const newStatus = !isActive;
      setIsActive(newStatus);
      await updateStaffStatus(newStatus);
    } catch (error) {
      console.error(error);
      setIsActive(!isActive);
      Alert.alert("Error", "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            // 1. Call backend first while we still have the token in memory
            // This hits your Redis logout logic
            await authService.logout();
          } catch (err) {
            console.log(
              "Backend logout failed, continuing with local cleanup",
              err,
            );
          } finally {
            // 2. Wipe the device's hard drive storage
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            await SecureStore.deleteItemAsync("user");

            // 3. Clear Redux memory (this makes 'user' null)
            dispatch(logout());

            // 4. Force navigation to the root (Login)
            // We use absolute path to ensure it hits index.tsx
            router.replace("/");
          }
        },
      },
    ]);
  };
  const menuOptions: MenuOption[] = [
    {
      label: "My Profile",
      icon: "user",
      color: "#4F46E5",
      bg: "#EEF2FF",
      onPress: () => {
        setMenuVisible(false);
        router.push("/(staff)/profile" as any);
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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const assigned = complaints.filter(
    (item) => item.status === "ASSIGNED",
  ).length;
  const resolved = complaints.filter(
    (item) => item.status === "RESOLVED",
  ).length;
  const total = complaints.length;
  const escalated = complaints.filter(
    (item) => item.status === "ESCALATED",
  ).length;
  const inProgress = complaints.filter(
    (item) => item.status === "IN_PROGRESS",
  ).length;

  if (isScanning) {
    return <UniversalScanner isFocused={true} onClose={closeScanner} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView className="px-5 pt-5 pb-20">
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <DashboardHeader
            userName={userName}
            avatarColor="#4F46E5"
            onAvatarPress={() => setMenuVisible(true)}
          />
        </View>

        {/* Status Card */}
        <View
          style={{
            backgroundColor: isActive ? "#4F46E5" : "#EF4444",
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            shadowColor: isActive ? "#4F46E5" : "#EF4444",
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View>
              <Text
                style={{
                  color: isActive ? "#E0E7FF" : "#FEE2E2",
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 4,
                }}
              >
                Current Status
              </Text>
              <Text
                style={{ color: "white", fontSize: 28, fontWeight: "bold" }}
              >
                {isActive ? "On Duty" : "Inactive"}
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: "#818cf8" }}
              thumbColor={isActive ? "#ffffff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleStatus}
              value={isActive}
              disabled={statusLoading}
            />
          </View>
          <Text
            style={{
              color: isActive ? "#C7D2FE" : "#FEE2E2",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            {isActive
              ? "You are currently marked as available."
              : "You are not receiving new tasks."}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatBox value={assigned} label="Currently Assigned" />
            <StatBox value={inProgress} label="In Progress" />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <View style={{ width: "50%" }}>
              <StatBox value={total} label="Total" highlight />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatBox value={resolved} label="Resolved" />
            <StatBox value={escalated} label="Escalated" />
          </View>
        </View>
      </ScrollView>

      {/* Profile Menu */}
      <ProfileMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        userName={userName}
        userEmail={user?.email}
        avatarColor="#4F46E5"
        menuOptions={menuOptions}
        onLogout={handleLogout}
      />

      {/* Floating Scan Button */}
      <TouchableOpacity
        onPress={startScan}
        style={{
          position: "absolute",
          bottom: 30,
          right: 20,
          backgroundColor: "#4F46E5",
          width: 60,
          height: 60,
          borderRadius: 30,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <Feather name="maximize" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
