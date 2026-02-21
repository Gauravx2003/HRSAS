import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  ImageBackground,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import { RootState } from "../../src/store/store";
import { logout, User } from "../../src/store/authSlice";
import { getCampusHubData } from "../../src/services/campusHub.service";
import { registerForPushNotificationsAsync } from "@/src/utils/notificationHelper";
import { notificationsService } from "@/src/services/notifications.service";
import { DashboardHeader } from "../../components/DashboardHeader";
import {
  ProfileMenuModal,
  MenuOption,
} from "../../components/ProfileMenuModal";

export default function ResidentDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const userName = user?.name || "Student";
  const [menuVisible, setMenuVisible] = useState(false);

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
      label: "Profile",
      icon: "user",
      color: "#2563EB",
      bg: "#EFF6FF",
      onPress: () => {
        setMenuVisible(false);
        router.push("/(resident)/profile" as any);
      },
    },
    {
      label: "Change Password",
      icon: "lock",
      color: "#7C3AED",
      bg: "#F5F3FF",
      onPress: () => {
        setMenuVisible(false);
        Alert.alert("Coming Soon", "Change Password will be available soon.");
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

  // ── Animations ──────────────────────────────────────────
  const bannerPulse = useRef(new Animated.Value(1)).current;
  const urgentShake = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle pulse on event banner
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, {
          toValue: 1.02,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(bannerPulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Shake for urgent badge icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(urgentShake, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(urgentShake, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(urgentShake, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ]),
    ).start();

    // Badge bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeBounce, {
          toValue: -4,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(badgeBounce, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ]),
    ).start();
  }, []);

  const shakeInterpolation = urgentShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-3deg", "0deg", "3deg"],
  });

  // Quick Action Buttons Data
  const actions = [
    {
      label: "Gate Pass",
      icon: "key",
      route: "/(resident)/gate-pass",
      color: "bg-purple-100",
      iconColor: "#7C3AED",
    },
    {
      label: "Visitor",
      icon: "users",
      route: "/(resident)/visitors",
      color: "bg-pink-100",
      iconColor: "#DB2777",
    },
    {
      label: "Library",
      icon: "book",
      route: "/(resident)/library",
      color: "bg-orange-100",
      iconColor: "#EA580C",
    },
    {
      label: "Campus Hub",
      icon: "globe",
      route: "/(resident)/campus-hub",
      color: "bg-teal-100",
      iconColor: "#0D9488",
    },
    {
      label: "Lost & Found",
      icon: "search",
      route: "/(resident)/lostAndFound",
      color: "bg-red-100",
      iconColor: "#DC2626",
    },
    {
      label: "Attendance",
      icon: "user-check",
      route: "/(resident)/attendance",
      color: "bg-indigo-100",
      iconColor: "#4F46E5",
    },
    {
      label: "Payments",
      icon: "credit-card",
      route: "/(resident)/payments",
      color: "bg-green-100",
      iconColor: "#10B981",
    },
    {
      label: "Laundry",
      icon: "droplet",
      route: "/(resident)/laundry",
      color: "bg-blue-100",
      iconColor: "#0D9488",
    },
  ];

  // ── Data Fetching ───────────────────────────────────────
  const [latestEvent, setLatestEvent] = React.useState<any>(null);
  const [urgentNotice, setUrgentNotice] = React.useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const data = await getCampusHubData();
      if (data.events && data.events.length > 0) {
        setLatestEvent(data.events[0]);
      } else {
        setLatestEvent(null);
      }

      const urgent = data.notices.find((n: any) => n.type === "EMERGENCY");
      if (urgent) {
        setUrgentNotice(urgent);
      } else {
        setUrgentNotice(null);
      }
    } catch (err) {
      console.log("Dashboard fetch error", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, []),
  );

  useEffect(() => {
    const syncToken = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        // Send to your backend
        await notificationsService.updatePushToken(token);
      }
    };

    syncToken();
  }, []);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      edges={["top", "left", "right"]}
    >
      <ScrollView className="px-5 pt-5 pb-20">
        {/* 1. Header Section */}
        <View className="mb-6">
          <DashboardHeader
            userName={userName}
            onAvatarPress={() => setMenuVisible(true)}
          />
        </View>

        {/* 2. Status Card */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-row items-center justify-between mb-6">
          <View className="flex-row items-center space-x-3">
            <View className="h-3 w-3 bg-green-500 rounded-full" />
            <Text className="font-sn-pro-medium text-gray-700 text-base ml-2">
              Status: In Hostel
            </Text>
          </View>
          <TouchableOpacity>
            <Text className="font-sn-pro-medium text-blue-600">Change</Text>
          </TouchableOpacity>
        </View>

        {/* ★ TODAY'S EVENT BANNER ──────────────────── */}
        {latestEvent && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: "/(resident)/campus-hub" as any,
                params: { tab: "Events" },
              })
            }
          >
            <Animated.View style={{ transform: [{ scale: bannerPulse }] }}>
              <ImageBackground
                source={
                  latestEvent.bannerUrl
                    ? { uri: latestEvent.bannerUrl }
                    : require("@/assets/images/garba.jpg")
                }
                style={styles.bannerBackground}
                imageStyle={{ borderRadius: 24 }}
              >
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.overlay}
                >
                  <Animated.View
                    style={[
                      styles.liveBadge,
                      { transform: [{ translateY: badgeBounce }] },
                    ]}
                  >
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>
                      {new Date(latestEvent.startDate).toDateString() ===
                      new Date().toDateString()
                        ? "TODAY"
                        : "UPCOMING"}
                    </Text>
                  </Animated.View>

                  <View style={styles.contentContainer}>
                    <View style={styles.typeRow}>
                      <Feather
                        name="music"
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text style={styles.typeText}>
                        {latestEvent.category}
                      </Text>
                    </View>

                    <Text style={styles.eventTitle}>{latestEvent.title}</Text>
                    <Text style={styles.eventSub}>
                      {latestEvent.location} •{" "}
                      {new Date(latestEvent.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>

                    <View style={styles.actionBar}>
                      <View style={styles.actionLeft}>
                        <Feather
                          name="arrow-right-circle"
                          size={18}
                          color="white"
                        />
                        <Text style={styles.actionText}>
                          Tap to view details
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color="white" />
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* ★ URGENT NOTICE BANNER ─────────────────── */}
        {urgentNotice && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: "/(resident)/campus-hub" as any,
                params: { tab: "Notices" },
              })
            }
            className="mb-5"
          >
            <View className="bg-red-50 rounded-2xl p-4 border border-red-200 relative overflow-hidden">
              <View className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 rounded-l-2xl" />

              <View className="flex-row items-start ml-2">
                <Animated.View
                  className="bg-red-100 h-10 w-10 rounded-full items-center justify-center mr-3 mt-0.5"
                  style={{ transform: [{ rotate: shakeInterpolation }] }}
                >
                  <Feather name="alert-triangle" size={18} color="#DC2626" />
                </Animated.View>

                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <View className="bg-red-500 px-2 py-0.5 rounded mr-2">
                      <Text className="font-sn-pro-bold text-white text-xs">
                        URGENT
                      </Text>
                    </View>
                    <Text className="font-sn-pro-medium text-gray-400 text-xs">
                      {new Date(urgentNotice.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="font-sn-pro-bold text-red-800 text-base mb-0.5">
                    {urgentNotice.title}
                  </Text>
                  <Text
                    className="font-sn-pro-medium text-red-600/70 text-sm"
                    numberOfLines={2}
                  >
                    {urgentNotice.description}
                  </Text>
                </View>

                <Feather
                  name="chevron-right"
                  size={18}
                  color="#DC2626"
                  style={{ marginTop: 14 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 3. Smart Mess Widget (Feature Card) */}
        {/* <View className="bg-blue-600 rounded-3xl p-5 mb-8 shadow-lg relative overflow-hidden">
          <View className="absolute -right-10 -top-10 h-32 w-32 bg-blue-500 rounded-full opacity-50" />

          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-blue-100 font-medium mb-1">
                Upcoming Meal
              </Text>
              <Text className="text-white text-2xl font-bold">Lunch</Text>
              <Text className="text-blue-200 text-sm mb-4">
                12:30 PM - 02:30 PM
              </Text>
            </View>
            <Feather name="coffee" size={40} color="rgba(255,255,255,0.2)" />
          </View>

          <View className="bg-white/20 p-3 rounded-xl flex-row items-center justify-between backdrop-blur-md">
            <Text className="text-white font-medium ml-2">
              I'm eating today
            </Text>
            <View className="bg-white h-6 w-10 rounded-full items-end justify-center px-1">
              <View className="h-4 w-4 bg-green-500 rounded-full" />
            </View>
          </View>
        </View> */}

        {/* 4. Quick Actions Grid */}
        <Text className="font-sn-pro-bold text-lg text-gray-900 mb-4">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className="w-[31%] bg-white p-3 rounded-2xl mb-4 shadow-sm border border-gray-100 items-center justify-center space-y-2"
              onPress={() => router.push(action.route as any)}
            >
              <View className={`p-3 rounded-full ${action.color} mb-2`}>
                <Feather
                  name={action.icon as any}
                  size={22}
                  color={action.iconColor}
                />
              </View>
              <Text className="font-sn-pro-medium text-center text-xs text-gray-700">
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Profile Menu */}
      <ProfileMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        userName={userName}
        userEmail={user?.email}
        menuOptions={menuOptions}
        onLogout={handleLogout}
      />

      {/* 5. SOS Button (Floating) */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-red-600 h-16 w-16 rounded-full items-center justify-center shadow-lg border-4 border-white"
        onPress={() => alert("SOS Triggered! Location Sent.")}
      >
        <Feather name="alert-circle" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bannerBackground: {
    height: 200, // Fixed height for dashboard consistency
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-end", // Push content to the bottom
    borderRadius: 24,
  },
  liveBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backdropFilter: "blur(10px)", // Works on iOS
  },
  liveDot: {
    height: 8,
    width: 8,
    backgroundColor: "#4ade80",
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    color: "white",
    fontSize: 10,
    fontFamily: "SNProBold",
  },
  contentContainer: {
    width: "100%",
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  typeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontFamily: "SNProBold",
    marginLeft: 6,
    letterSpacing: 1,
  },
  eventTitle: {
    color: "white",
    fontSize: 24,
    fontFamily: "SNProBlack",
  },
  eventSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "SNProMedium",
    marginBottom: 12,
  },
  actionBar: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    color: "white",
    fontFamily: "SNProBold",
    marginLeft: 8,
    fontSize: 13,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  modalAvatar: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
  },
  modalUserName: {
    fontSize: 18,
    fontFamily: "SNProBold",
    color: "#111827",
  },
  modalUserEmail: {
    fontSize: 13,
    fontFamily: "SNProMedium",
    color: "#6B7280",
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  menuIconCircle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "SNProBold",
    color: "#1F2937",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "SNProBold",
    color: "#DC2626",
  },
});
