import React, { useEffect } from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import {
  getAssignedComplaints,
  AssignedComplaint,
} from "../../src/services/staff.service";
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";

// @ts-ignore
import { RootState } from "../../src/store/store";

const AnimatedNumber = ({ target, style }: { target: number; style: any }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;

    // Total animation time in ms
    const totalDuration = 1500;
    // Increase step size for large numbers so it doesn't take forever
    const increment = Math.ceil(end / (totalDuration / 16));

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16); // ~60fps

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
    {/* Use the animated component here */}
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
  const user = useSelector((state: RootState) => state.auth.user);
  const userName = user?.name || "Staff Member";

  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const data = await getAssignedComplaints();
      setComplaints(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchComplaints();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "500" }}>
              Good Morning,
            </Text>
            <Text
              style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}
            >
              {userName}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: "white",
              padding: 10,
              borderRadius: 20,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 5,
            }}
          >
            <Feather name="bell" size={24} color="#374151" />
          </View>
        </View>

        {/* Status Card */}
        <View
          style={{
            backgroundColor: "#4F46E5",
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            shadowColor: "#4F46E5",
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}
        >
          <Text
            style={{
              color: "#E0E7FF",
              fontSize: 14,
              fontWeight: "500",
              marginBottom: 4,
            }}
          >
            Current Status
          </Text>
          <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>
            On Duty
          </Text>
          <Text style={{ color: "#C7D2FE", fontSize: 12, marginTop: 8 }}>
            You are currently marked as available.
          </Text>
        </View>

        {/* Quick Stats (Placeholder) */}
        {/* Grid Container */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {/* Row 1: Top Corners */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatBox value={assigned} label="Currently Assigned" />
            <StatBox value={inProgress} label="In Progress" />
          </View>

          {/* Row 2: The Center (Total) */}
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <View style={{ width: "50%" }}>
              <StatBox value={total} label="Total" highlight />
            </View>
          </View>

          {/* Row 3: Bottom Corners */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatBox value={resolved} label="Resolved" />
            <StatBox value={escalated} label="Escalated" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
