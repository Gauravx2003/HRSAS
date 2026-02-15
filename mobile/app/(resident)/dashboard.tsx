import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useRouter } from "expo-router";
// Adjust this import path if needed to match your store location
// @ts-ignore
import { RootState } from "../../src/store/store";

export default function ResidentDashboard() {
  const router = useRouter();
  // Get user from Redux (if null, default to "Student")
  const user = useSelector((state: RootState) => state.auth.user);
  const userName = user?.name || "Student";

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
      label: "Events",
      icon: "calendar",
      route: "/(resident)/events",
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
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="px-5 pt-5 pb-20">
        {/* 1. Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-gray-500 text-sm font-medium">
              Good Morning,
            </Text>
            <Text className="text-2xl font-bold text-gray-900">{userName}</Text>
          </View>
          <TouchableOpacity className="bg-white p-2 rounded-full shadow-sm">
            <Feather name="bell" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* 2. Status Card */}
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-row items-center justify-between mb-6">
          <View className="flex-row items-center space-x-3">
            <View className="h-3 w-3 bg-green-500 rounded-full" />
            <Text className="text-gray-700 font-semibold text-base ml-2">
              Status: In Hostel
            </Text>
          </View>
          <TouchableOpacity>
            <Text className="text-blue-600 font-medium">Change</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Smart Mess Widget (Feature Card) */}
        <View className="bg-blue-600 rounded-3xl p-5 mb-8 shadow-lg relative overflow-hidden">
          {/* Decorative Circle */}
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
        </View>

        {/* 4. Quick Actions Grid */}
        <Text className="text-lg font-bold text-gray-900 mb-4">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className="w-[48%] bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100 items-center justify-center space-y-2"
              onPress={() => router.push(action.route as any)} // Cast to any to allow placeholder routes
            >
              <View className={`p-3 rounded-full ${action.color} mb-2`}>
                <Feather
                  name={action.icon as any}
                  size={24}
                  color={action.iconColor}
                />
              </View>
              <Text className="font-medium text-gray-700">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
