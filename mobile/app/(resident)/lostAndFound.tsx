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
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
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
import { LinearGradient } from "expo-linear-gradient";

export default function LostAndFoundScreen() {
  const [activeTab, setActiveTab] = useState<"report" | "found" | "history">(
    "report",
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fullscreen Image Viewer
  const [viewerImage, setViewerImage] = useState<string | null>(null);

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
          <Text style={styles.cardId}>#{item.id.slice(0, 8)}</Text>
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

      {/* Attachment Thumbnails */}
      {item.attachments && item.attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachmentRow}
        >
          {item.attachments.map((att) => (
            <TouchableOpacity
              key={att.id}
              onPress={() => setViewerImage(att.fileURL)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: att.fileURL }}
                style={styles.attachmentThumb}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
          <Text style={styles.cardId}>#{item.id.slice(0, 8)}</Text>
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

      {/* Attachment Thumbnails */}
      {item.attachments && item.attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachmentRow}
        >
          {item.attachments.map((att) => (
            <TouchableOpacity
              key={att.id}
              onPress={() => setViewerImage(att.fileURL)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: att.fileURL }}
                style={styles.attachmentThumb}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#1E1B4B", "#312E81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text className="font-sn-pro-bold" style={styles.headerTitle}>
          Lost & Found
        </Text>
        <Text style={styles.headerSub}>Report lost items and find them</Text>
      </LinearGradient>

      {/* TABS */}
      <View style={styles.inner}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "report" && styles.tabActive]}
            onPress={() => setActiveTab("report")}
          >
            <Text
              className="font-sn-pro-bold"
              style={
                activeTab === "report"
                  ? styles.tabTextActive
                  : styles.tabTextInactive
              }
            >
              Report Lost
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "found" && styles.tabActive]}
            onPress={() => setActiveTab("found")}
          >
            <Text
              className="font-sn-pro-bold"
              style={
                activeTab === "found"
                  ? styles.tabTextActive
                  : styles.tabTextInactive
              }
            >
              Found Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              className="font-sn-pro-bold"
              style={
                activeTab === "history"
                  ? styles.tabTextActive
                  : styles.tabTextInactive
              }
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
                    <Text style={styles.dateText}>
                      {dateLost.toDateString()}
                    </Text>
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
                <Text style={styles.emptyText}>
                  No found items reported yet.
                </Text>
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
      </View>
      {/* Fullscreen Image Viewer */}
      <Modal
        visible={!!viewerImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <Pressable
          style={styles.imageViewerBackdrop}
          onPress={() => setViewerImage(null)}
        >
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setViewerImage(null)}
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          {viewerImage && (
            <Image
              source={{ uri: viewerImage }}
              style={styles.imageViewerFull}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabTextActive: { fontWeight: "600", color: "#111827" },
  tabTextInactive: { fontWeight: "600", color: "#6B7280" },

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
  cardId: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "monospace",
    marginBottom: 2,
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

  // Attachment Thumbnails
  attachmentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingBottom: 4,
  },
  attachmentThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },

  // Fullscreen Image Viewer
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageViewerFull: {
    width: width - 32,
    height: width - 32,
    borderRadius: 12,
  },
});
