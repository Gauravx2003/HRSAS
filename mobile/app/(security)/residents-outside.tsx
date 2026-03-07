import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { getResidentsOutside } from "../../src/services/attendance.service";

interface Resident {
  id: string;
  name: string;
  phone: string;
  email: string;
  roomNumber: string | null;
  blockName: string | null;
  lastOutTime: string | null;
}

export default function ResidentsOutsideScreen() {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchResidents = async () => {
    try {
      const res = await getResidentsOutside();
      if (res.success) {
        setResidents(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch residents outside", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Reset and fetch fresh data every time the screen comes into focus
      setLoading(true);
      setResidents([]);
      fetchResidents();
      const interval = setInterval(fetchResidents, 10000);
      return () => clearInterval(interval);
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchResidents();
    setRefreshing(false);
  }, []);

  const handleCall = (phone: string) => {
    const url =
      Platform.OS === "android" ? `tel:${phone}` : `telprompt:${phone}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`tel:${phone}`).catch(console.error),
    );
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    const now = new Date();

    const hours = d.getHours();
    const mins = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    const m = mins.toString().padStart(2, "0");
    const timeStr = `${h}:${m} ${ampm}`;

    // If same day, just show time; otherwise show date too
    if (d.toDateString() === now.toDateString()) {
      return `Today, ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }

    const day = d.getDate();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${day} ${monthNames[d.getMonth()]}, ${timeStr}`;
  };

  const filtered = residents.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const renderResident = ({ item }: { item: Resident }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.cardMeta}>
            {item.roomNumber && (
              <View style={styles.metaChip}>
                <Feather name="home" size={11} color="#6B7280" />
                <Text style={styles.metaText}>
                  {item.blockName ? `${item.blockName}-` : ""}
                  {item.roomNumber}
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Feather name="clock" size={11} color="#EF4444" />
              <Text style={[styles.metaText, { color: "#EF4444" }]}>
                Left {formatTime(item.lastOutTime)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => handleCall(item.phone)}
          activeOpacity={0.8}
        >
          <Feather name="phone" size={16} color="#fff" />
          <Text style={styles.callBtnText}>Call</Text>
        </TouchableOpacity>

        <Text style={styles.phoneLabel}>{item.phone}</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.emptyContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.emptyIconCircle}>
        <Feather name="check-circle" size={40} color="#16A34A" />
      </View>
      <Text style={styles.emptyTitle}>
        {search ? "No matches found" : "All Clear!"}
      </Text>
      <Text style={styles.emptySub}>
        {search
          ? "Try a different search term"
          : "All residents are inside the hostel"}
      </Text>
      <Text style={styles.emptyPullHint}>Pull down to refresh</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Residents Outside</Text>
          <Text style={styles.headerSub}>
            {filtered.length} resident{filtered.length !== 1 ? "s" : ""}{" "}
            currently outside
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={18}
          color="#9CA3AF"
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading residents...</Text>
        </View>
      ) : filtered.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderResident}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSub: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 1,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    padding: 0,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Card
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F46E5",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Actions
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  callBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  phoneLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(22,163,74,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "500",
  },
  emptyPullHint: {
    fontSize: 12,
    color: "#C4C9D4",
    marginTop: 16,
    fontWeight: "500",
  },
});
