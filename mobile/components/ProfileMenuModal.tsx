import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { api } from "../src/services/api";

export interface MenuOption {
  label: string;
  /** Any valid Feather icon name */
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  bg: string;
  onPress: () => void;
}

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userEmail?: string;
  /** Background colour of the large avatar in the modal header. Defaults to "#2563EB". */
  avatarColor?: string;
  profilePicUrl?: string | null;
  onProfilePicUpdate?: (newUrl: string) => void;
  menuOptions: MenuOption[];
  onLogout: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ProfileMenuModal({
  visible,
  onClose,
  userName,
  userEmail,
  avatarColor = "#2563EB",
  profilePicUrl,
  onProfilePicUpdate,
  menuOptions,
  onLogout,
}: ProfileMenuModalProps) {
  const initials = getInitials(userName);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarPress = async () => {
    try {
      // Request permissions (handled automatically on some OS, but good practice)
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      const filename = uri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      // @ts-ignore - React Native FormData works slightly differently than web
      formData.append("profilePic", { uri, name: filename, type });

      const response = await api.post("/users/upload-profile-pic", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.profilePicUrl && onProfilePicUpdate) {
        onProfilePicUpdate(response.data.profilePicUrl);
      }

      Alert.alert("Success", "Profile picture updated successfully");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        "Could not upload profile picture. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner Pressable stops tap-through closing the sheet */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* User info */}
          <View style={styles.userRow}>
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: avatarColor }]}
              onPress={handleAvatarPress}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : profilePicUrl ? (
                <Image
                  source={{ uri: profilePicUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}

              {/* Camera Icon Overlay */}
              <View style={styles.cameraIconContainer}>
                <Feather name="camera" size={12} color="white" />
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text className="font-sn-pro-bold" style={styles.userName}>
                {userName}
              </Text>
              <Text className="font-sn-pro-medium" style={styles.userEmail}>
                {userEmail || "user@hostel.com"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu items */}
          {menuOptions.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.menuItem}
              onPress={opt.onPress}
              activeOpacity={0.6}
            >
              <View style={[styles.iconCircle, { backgroundColor: opt.bg }]}>
                <Feather name={opt.icon} size={18} color={opt.color} />
              </View>
              <Text className="font-sn-pro-bold" style={styles.menuLabel}>
                {opt.label}
              </Text>
              <Feather name="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onLogout}
            activeOpacity={0.6}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FEF2F2" }]}>
              <Feather name="log-out" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.menuLabel, styles.logoutLabel]}>Log Out</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: -2,
    backgroundColor: "#374151",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,

    color: "#111827",
  },
  userEmail: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
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
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
  },
  logoutLabel: {
    color: "#DC2626",
  },
});
