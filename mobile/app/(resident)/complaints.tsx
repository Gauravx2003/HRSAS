import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
// @ts-ignore
import { RootState } from "../../src/store/store";
import {
  getComplaintCategories,
  getMyComplaints,
  raiseComplaint,
  Complaint,
  ComplaintCategory,
} from "../../src/services/complaints.service";

export default function ComplaintsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);

  const [activeTab, setActiveTab] = useState<"history" | "new">("history");

  // Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, myComplaints] = await Promise.all([
        getComplaintCategories(),
        getMyComplaints(),
      ]);
      setCategories(cats);
      setComplaints(myComplaints);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load complaints data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSubmit = async () => {
    if (!title || !desc || !selectedCategory) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (!user?.roomId) {
      Alert.alert("Error", "Room ID not found for user. Please contact admin.");
      return;
    }

    try {
      setSubmitting(true);
      await raiseComplaint({
        categoryId: selectedCategory,
        title,
        description: desc,
        roomId: user.roomId,
      });

      Alert.alert("Success", "Complaint raised successfully!");
      setTitle("");
      setDesc("");
      setSelectedCategory("");
      setActiveTab("history");
      fetchData(); // Refresh list
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to raise complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    let bg = "#E5E7EB";
    let text = "#374151";

    switch (status) {
      case "RESOLVED":
        bg = "#DCFCE7";
        text = "#15803D";
        break;
      case "PENDING":
        bg = "#FEF9C3";
        text = "#854D0E";
        break;
      case "Rejected":
        bg = "#FEE2E2";
        text = "#B91C1C";
        break;
      case "IN_PROGRESS":
        bg = "#DBEAFE";
        text = "#1E40AF";
        break;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color: text }]}>{status}</Text>
      </View>
    );
  };

  // 1. Render History List
  const renderHistory = () => (
    <FlatList
      data={complaints}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        !loading ? (
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text style={{ color: "#6B7280" }}>No complaints found</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{item.categoryName || "Issue"}</Text>
            </View>
            {renderStatusBadge(item.status)}
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardFooter}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text
            numberOfLines={2}
            style={{ color: "#6B7280", marginTop: 4, fontSize: 13 }}
          >
            {item.description}
          </Text>
          {item.staffName && (
            <Text style={styles.assignedText}>
              Assigned to: {item.staffName}
            </Text>
          )}
        </View>
      )}
    />
  );

  // 2. Render New Complaint Form
  const renderForm = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.formContainer}>
          <Text style={styles.label}>Issue Category</Text>
          <View style={styles.chipContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.chip,
                  selectedCategory === cat.id
                    ? styles.chipActive
                    : styles.chipInactive,
                ]}
              >
                <Text
                  style={
                    selectedCategory === cat.id
                      ? styles.chipTextActive
                      : styles.chipTextInactive
                  }
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fan not working"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder="Describe details..."
            multiline
            value={desc}
            onChangeText={setDesc}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Complaint</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Complaints</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={
              activeTab === "history"
                ? styles.tabTextActive
                : styles.tabTextInactive
            }
          >
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "new" && styles.tabActive]}
          onPress={() => setActiveTab("new")}
        >
          <Text
            style={
              activeTab === "new"
                ? styles.tabTextActive
                : styles.tabTextInactive
            }
          >
            Raise New
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 20 }}
        />
      ) : activeTab === "history" ? (
        renderHistory()
      ) : (
        renderForm()
      )}
    </SafeAreaView>
  );
}

// Standard Styles (Safe & Reliable)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 20,
  },

  // Tabs
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

  // Card
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  catBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardFooter: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  assignedText: {
    fontSize: 12,
    color: "#059669",
    marginTop: 8,
    fontWeight: "500",
  },

  // Form
  formContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Chips
  chipContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipInactive: { backgroundColor: "white", borderColor: "#E5E7EB" },
  chipTextActive: { color: "white", fontWeight: "500" },
  chipTextInactive: { color: "#4B5563", fontWeight: "500" },
});
