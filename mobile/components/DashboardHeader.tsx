import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

interface DashboardHeaderProps {
  userName: string;
  onAvatarPress: () => void;
  /** Background colour of the avatar circle. Defaults to "#2563EB". */
  avatarColor?: string;
  profilePicUrl?: string | null;
  /** Optional node rendered between the greeting and the avatar (e.g. a status badge). */
  rightSlot?: React.ReactNode;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning,";
  if (hour < 17) return "Good Afternoon,";
  return "Good Evening,";
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function DashboardHeader({
  userName,
  onAvatarPress,
  avatarColor = "#2563EB",
  profilePicUrl,
  rightSlot,
}: DashboardHeaderProps) {
  const initials = getInitials(userName);

  return (
    <View style={styles.container}>
      {/* Greeting + Name */}
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text className="font-sn-pro-bold" style={styles.name}>
          {userName}
        </Text>
      </View>

      {/* Optional right slot + avatar */}
      <View style={styles.right}>
        {rightSlot}
        <TouchableOpacity
          onPress={onAvatarPress}
          style={[styles.avatar, { backgroundColor: avatarColor }]}
          activeOpacity={0.8}
        >
          {profilePicUrl ? (
            <Image source={{ uri: profilePicUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  name: {
    fontSize: 24,
    color: "#111827",
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
});
