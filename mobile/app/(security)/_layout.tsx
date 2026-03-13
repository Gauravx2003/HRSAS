import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, AppState } from "react-native";
import { useOfflineSyncEngine } from "@/hooks/useOfflineSyncEngine";

// ─── MAIN LAYOUT COMPONENT ───
export default function GuardLayout() {
  // (You had it named ResidentLayout, but it's the guard's view!)
  const insets = useSafeAreaInsets();

  // 🚨 TRIGGER THE ENGINE HERE
  // It will sit quietly in the background on all tabs
  useOfflineSyncEngine();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 10,
          paddingBottom: Platform.OS === "android" ? insets.bottom + 10 : 20,
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          elevation: 0, // Removes Android shadow for a cleaner look
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: -2,
        },
      }}
    >
      {/* 1. HOME (Visible) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={24} color={color} />
          ),
        }}
      />

      {/* 2. ATTENDANCE (Visible) */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />

      {/* 3. MESS MENU (Visible) */}
      <Tabs.Screen
        name="mess"
        options={{
          title: "Mess Menu",
          tabBarIcon: ({ color }) => (
            <Feather name="coffee" size={24} color={color} />
          ),
        }}
      />

      {/* 4. VISITORS (Visible) */}
      <Tabs.Screen
        name="visitors"
        options={{
          title: "Visitors",
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={24} color={color} />
          ),
        }}
      />

      {/* PROFILE (Hidden) */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />

      {/* RESIDENTS OUTSIDE (Hidden) */}
      <Tabs.Screen
        name="residents-outside"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
