import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import {
  reportLostItem,
  getFoundItems,
  getMyLostItems,
  claimItem,
  LostItem,
  FoundItem,
} from "../../src/services/lostAndFound.service";

export default function LostAndFoundScreen() {
  const [activeTab, setActiveTab] = useState<"report" | "found" | "history">(
    "report",
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- TAB 1: REPORT LOST ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [location, setLocation] = useState("");
  const [dateLost, setDateLost] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const categories = ["Electronics", "Wallet/ID", "Keys", "Clothing", "Other"];

  const handleReport = async () => {
    if (!title || !description || !location) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      await reportLostItem({
        title,
        description,
        category,
        lostLocation: location,
        lostDate: dateLost.toISOString(),
      });
      Alert.alert("Success", "Lost item reported successfully!");
      // Reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setImages([]);
      setActiveTab("history");
      fetchHistory();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to report item.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Basic implementation for now
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  // --- TAB 2: FOUND ITEMS ---
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);

  const fetchFound = async () => {
    try {
      setLoading(true);
      const data = await getFoundItems();
      setFoundItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id: string) => {
    Alert.alert(
      "Claim Item",
      "Are you sure you want to claim this item? Admins will verify your claim.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: async () => {
            try {
              await claimItem(id);
              Alert.alert("Success", "Claim request sent!");
              fetchFound();
            } catch (err) {
              Alert.alert("Error", "Failed to claim item.");
            }
          },
        },
      ],
    );
  };

  // --- TAB 3: HISTORY ---
  const [myItems, setMyItems] = useState<LostItem[]>([]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getMyLostItems();
      setMyItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- EFFECTS ---
  useFocusEffect(
    useCallback(() => {
      if (activeTab === "found") fetchFound();
      if (activeTab === "history") fetchHistory();
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "found") fetchFound().then(() => setRefreshing(false));
    else if (activeTab === "history")
      fetchHistory().then(() => setRefreshing(false));
    else setRefreshing(false);
  };

  // --- RENDERERS ---

  const renderFoundItem = ({ item }: { item: FoundItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Feather name="package" size={20} color="#4F46E5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSub}>{item.location}</Text>
        </View>
        <View style={styles.badgeFound}>
          <Text style={styles.badgeTextFound}>
            {item.status === "OPEN" ? "FOUND" : item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          <Feather name="calendar" size={12} />{" "}
          {new Date(item.dateFound || item.createdAt).toLocaleDateString()}
        </Text>
        {item.status === "OPEN" ? (
          <TouchableOpacity
            style={styles.claimBtn}
            onPress={() => handleClaim(item.id)}
          >
            <Text style={styles.claimText}>Claim This</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.claimBtn, { backgroundColor: "#F3F4F6" }]}>
            <Text style={[styles.claimText, { color: "#6B7280" }]}>
              {item.status === "CLAIMED" ? "Claimed" : "Closed"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: LostItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: item.status === "FOUND" ? "#EEF2FF" : "#FEF2F2",
            },
          ]}
        >
          <Feather
            name={item.status === "FOUND" ? "check" : "search"}
            size={20}
            color={item.status === "FOUND" ? "#4F46E5" : "#EF4444"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSub}>
            Reported: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            item.status === "OPEN"
              ? styles.bgRed
              : item.status === "FOUND"
                ? styles.bgBlue
                : item.status === "CLAIMED"
                  ? styles.bgGreen
                  : styles.bgGray,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              item.status === "OPEN"
                ? styles.textRed
                : item.status === "FOUND"
                  ? styles.textBlue
                  : item.status === "CLAIMED"
                    ? styles.textGreen
                    : styles.textGray,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={1}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lost & Found</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "report" && styles.tabActive]}
          onPress={() => setActiveTab("report")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "report" && styles.tabTextActive,
            ]}
          >
            Report Lost
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "found" && styles.tabActive]}
          onPress={() => setActiveTab("found")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "found" && styles.tabTextActive,
            ]}
          >
            Found Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.tabTextActive,
            ]}
          >
            My History
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {activeTab === "report" && (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={
              <View style={styles.form}>
                <Text style={styles.label}>What did you lose?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Blue Wallet, AirPods"
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={styles.label}>Category</Text>
                <View style={styles.catRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        category === cat && styles.catChipActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catText,
                          category === cat && styles.catTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Where was it lost? (Approx)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Library, Canteen"
                  value={location}
                  onChangeText={setLocation}
                />

                <Text style={styles.label}>Date Lost</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateBtn}
                >
                  <Feather name="calendar" size={16} color="#4B5563" />
                  <Text style={styles.dateText}>{dateLost.toDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dateLost}
                    mode="date"
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (d) setDateLost(d);
                    }}
                  />
                )}

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[
                    styles.input,
                    { height: 100, textAlignVertical: "top" },
                  ]}
                  placeholder="Describe the item..."
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleReport}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitText}>Report Item</Text>
                  )}
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {activeTab === "found" && (
          <FlatList
            data={foundItems}
            keyExtractor={(item) => item.id}
            renderItem={renderFoundItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No found items reported yet.</Text>
            }
          />
        )}

        {activeTab === "history" && (
          <FlatList
            data={myItems}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                You haven't reported anything.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { padding: 20, backgroundColor: "white" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tab: { marginRight: 20, paddingBottom: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4F46E5" },
  tabText: { fontSize: 16, color: "#6B7280", fontWeight: "600" },
  tabTextActive: { color: "#4F46E5" },

  content: { flex: 1 },

  // FORM
  form: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
  },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  catChipActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  catText: { fontSize: 14, color: "#4B5563" },
  catTextActive: { color: "#4F46E5", fontWeight: "600" },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  dateText: { fontSize: 16, color: "#111827" },
  submitBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // CARDS
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  cardSub: { fontSize: 12, color: "#6B7280" },
  cardDesc: { fontSize: 14, color: "#4B5563", marginBottom: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cardDate: { fontSize: 12, color: "#9CA3AF" },
  claimBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimText: { color: "white", fontSize: 12, fontWeight: "600" },

  badgeFound: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeTextFound: { color: "#059669", fontSize: 10, fontWeight: "700" },

  emptyText: { textAlign: "center", marginTop: 40, color: "#9CA3AF" },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  bgRed: { backgroundColor: "#FEF2F2" },
  textRed: { color: "#EF4444" },
  bgBlue: { backgroundColor: "#EFF6FF" },
  textBlue: { color: "#3B82F6" },
  bgGreen: { backgroundColor: "#F0FDF4" },
  textGreen: { color: "#16A34A" },
  bgGray: { backgroundColor: "#F3F4F6" },
  textGray: { color: "#6B7280" },
});
