import { Feather } from "@expo/vector-icons";
import { Alert } from "react-native";

// --- Types ---

export interface MenuOption {
  label: string;
  /** Any valid Feather icon name */
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  bg: string;
  onPress: (router: any, setMenuVisible: (visible: boolean) => void) => void;
}

export interface QuickAction {
  label: string;
  icon: string;
  route: string;
  color: string;
  iconColor: string;
}

// --- Constants ---

export const MENU_OPTIONS: MenuOption[] = [
  {
    label: "Profile",
    icon: "user",
    color: "#2563EB",
    bg: "#EFF6FF",
    onPress: (router, setMenuVisible) => {
      setMenuVisible(false);
      router.push("/(resident)/profile");
    },
  },
  {
    label: "Change Password",
    icon: "lock",
    color: "#7C3AED",
    bg: "#F5F3FF",
    onPress: (_, setMenuVisible) => {
      setMenuVisible(false);
      Alert.alert("Coming Soon", "Change Password will be available soon.");
    },
  },
  {
    label: "Notifications",
    icon: "bell",
    color: "#EA580C",
    bg: "#FFF7ED",
    onPress: (_, setMenuVisible) => {
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
    onPress: (_, setMenuVisible) => {
      setMenuVisible(false);
      Alert.alert("Coming Soon", "Appearance settings will be available soon.");
    },
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Attendance",
    icon: "user-check",
    route: "/(resident)/attendance",
    color: "bg-indigo-100",
    iconColor: "#4F46E5",
  },
  {
    label: "Marketplace",
    icon: "shopping-cart",
    route: "/(resident)/Marketplace",
    color: "bg-blue-100",
    iconColor: "#328ad6ff",
  },
  {
    label: "Payments",
    icon: "credit-card",
    route: "/(resident)/payments",
    color: "bg-green-100",
    iconColor: "#10B981",
  },
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
    label: "Laundry",
    icon: "droplet",
    route: "/(resident)/laundry",
    color: "bg-blue-100",
    iconColor: "#0D9488",
  },
];
