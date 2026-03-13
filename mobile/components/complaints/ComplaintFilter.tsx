import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native";

interface ComplaintFilterProps {
  filter: string;
  setFilter: (filter: any) => void;
  options?: string[];
}

export function ComplaintFilter({
  filter,
  setFilter,
  options = [
    "ALL",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "ESCALATED",
    "CLOSED",
  ],
}: ComplaintFilterProps) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {options.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filter === status &&
                (options.includes("OPEN")
                  ? styles.messFilterChipActive
                  : styles.filterChipActive),
            ]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                filter === status && styles.filterTextActive,
              ]}
            >
              {status.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    marginBottom: 4,
  },
  filterContent: {
    paddingHorizontal: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  filterChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  messFilterChipActive: {
    backgroundColor: "#B91C1C",
    borderColor: "#B91C1C",
  },
  filterText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "white",
  },
});
