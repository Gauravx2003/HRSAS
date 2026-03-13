import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScheduleItem } from "@/src/services/campusHub.service";

interface Props {
  schedule: ScheduleItem[];
}

const COLORS = ["#EA580C", "#2563EB", "#DC2626", "#10B981", "#8B5CF6"];

function getDayLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
}

export function ScheduleView({ schedule }: Props) {
  if (schedule.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="clock" size={40} color="#D1D5DB" />
        <Text style={styles.emptyStateText}>No scheduled items for today</Text>
      </View>
    );
  }

  const now = new Date();

  const sorted = [...schedule].sort((a, b) => {
    if (!a.scheduledFor) return 1;
    if (!b.scheduledFor) return -1;
    return (
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
  });

  // Group by date string (YYYY-MM-DD)
  const grouped: Record<string, ScheduleItem[]> = {};
  sorted.forEach((item) => {
    if (!item.scheduledFor) return;
    const dateKey = new Date(item.scheduledFor).toISOString().split("T")[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });

  return (
    <View className="mt-2">
      {Object.entries(grouped).map(([dateKey, items], groupIndex) => {
        const label = getDayLabel(dateKey);
        return (
          <View key={dateKey} className="mb-4">
            {/* Line break style date header */}
            <View
              className={`flex-row items-center justify-center mb-4 ${groupIndex > 0 ? "mt-2" : ""}`}
            >
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-4 text-sm font-bold text-gray-500 uppercase tracking-wider">
                {label}
              </Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {items.map((item, index) => {
              const time = item.scheduledFor
                ? new Date(item.scheduledFor).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "TBA";

              const displayColor = COLORS[index % COLORS.length];

              return (
                <View key={item.id} className="flex-row mb-6">
                  {/* Left: Time */}
                  <View className="w-15 items-end pr-4 pt-[10px]">
                    <Text className="text-xs font-bold text-gray-500">
                      {time}
                    </Text>
                  </View>

                  {/* Middle: Timeline dot + line */}
                  <View style={{ width: 24, alignItems: "center" }}>
                    {/* 1. The Dot */}
                    <View
                      style={{
                        height: 10,
                        width: 10,
                        borderRadius: 5,
                        borderWidth: 1.5,
                        borderColor: displayColor,
                        backgroundColor: "white",
                        marginTop: 3,
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                      }}
                    >
                      <View
                        style={{
                          height: 4,
                          width: 4,
                          borderRadius: 2,
                          backgroundColor: displayColor,
                          opacity: 0.7,
                        }}
                      />
                    </View>

                    {/* 2. The Line */}
                    {index < items.length - 1 && (
                      <View
                        style={{
                          width: 1,
                          flex: 1,
                          backgroundColor: "#E5E7EB",
                          marginTop: 3,
                          marginBottom: -16,
                          opacity: 0.6,
                        }}
                      />
                    )}
                  </View>

                  {/* Right: Task Card */}
                  <View
                    className="flex-1 ml-3 rounded-2xl p-4 mb-3 shadow-sm border"
                    style={{
                      backgroundColor: "white",
                      borderColor: "#F3F4F6",
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      <View
                        className="h-8 w-8 rounded-lg items-center justify-center mr-3"
                        style={{
                          backgroundColor: displayColor + "20",
                        }}
                      >
                        <Feather name="clock" size={16} color={displayColor} />
                      </View>
                      <Text className="text-lg font-bold text-gray-900">
                        {item.title}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm ml-11 leading-5">
                      {item.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyStateText: { color: "#9CA3AF", fontSize: 16, marginTop: 8 },
});
