import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { messService, MessIssue } from "../../src/services/mess.service";

const { width } = Dimensions.get("window");

// ... (Menu Data kept same)
const TODAY_MENU = [
  {
    type: "Breakfast",
    time: "07:30 - 09:30",
    items: "Aloo Paratha, Curd, Tea/Coffee",
  },
  {
    type: "Lunch",
    time: "12:30 - 02:30",
    items: "Rice, Dal Fry, Paneer Butter Masala, Roti, Salad",
  },
  { type: "Snacks", time: "17:00 - 18:00", items: "Samosa, Masala Tea" },
  {
    type: "Dinner",
    time: "19:30 - 21:30",
    items: "Veg Pulao, Mix Veg Curry, Roti, Kheer",
  },
];

export default function MessScreen() {
  // Tabs
  const [activeTab, setActiveTab] = useState<"menu" | "issues">("menu");

  // State
  const [isEating, setIsEating] = useState(false);
  const [activeMeal, setActiveMeal] = useState("Lunch");

  // Issues Data
  const [myIssues, setMyIssues] = useState<MessIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Complaint Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [complaintType, setComplaintType] = useState("FOOD");
  const [issueTitle, setIssueTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // QR Token Generation
  const qrToken = JSON.stringify({
    userId: "STU-123",
    date: new Date().toISOString().split("T")[0],
    meal: activeMeal,
    status: "APPROVED",
  });

  const fetchIssues = useCallback(async () => {
    try {
      setLoadingIssues(true);
      const data = await messService.getMyIssues();
      setMyIssues(data);
    } catch (error) {
      console.error("Failed to fetch mess issues", error);
    } finally {
      setLoadingIssues(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "issues") {
      fetchIssues();
    }
  }, [activeTab, fetchIssues]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIssues();
  };

  const handleSubmitComplaint = async () => {
    if (!issueTitle.trim() || !complaintDesc.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      setSubmitting(true);
      await messService.createIssue({
        issueTitle,
        issueDescription: complaintDesc,
        category: complaintType,
      });

      setModalVisible(false);
      setIssueTitle("");
      setComplaintDesc("");
      Alert.alert(
        "Complaint Registered",
        "The mess manager has been notified.",
        [
          {
            text: "View Issues",
            onPress: () => {
              setActiveTab("issues");
              fetchIssues();
            },
          },
          { text: "OK" },
        ],
      );
    } catch (error) {
      console.error("Failed to create mess issue:", error);
      Alert.alert("Error", "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    let bg = "#F1F5F9";
    let color = "#475569";

    switch (status) {
      case "RESOLVED":
        bg = "#DCFCE7";
        color = "#16A34A";
        break;
      case "REJECTED":
        bg = "#FEE2E2";
        color = "#B91C1C";
        break;
      case "IN_REVIEW":
        bg = "#DBEAFE";
        color = "#2563EB";
        break;
      case "OPEN":
        bg = "#FEF9C3";
        color = "#CA8A04";
        break;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color }]}>{status}</Text>
      </View>
    );
  };

  const renderIssuesList = () => {
    if (loadingIssues && !refreshing) {
      return (
        <ActivityIndicator
          size="large"
          color="#B91C1C"
          style={{ marginTop: 40 }}
        />
      );
    }

    return (
      <FlatList
        data={myIssues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No issues reported yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.issueCard}>
            <View style={styles.issueHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              {renderStatusBadge(item.status)}
            </View>
            <Text style={styles.issueTitle}>{item.issueTitle}</Text>
            <Text style={styles.issueDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.issueDesc} numberOfLines={2}>
              {item.issueDescription}
            </Text>
            {item.adminResponse && (
              <View style={styles.adminResponse}>
                <Text style={styles.adminResponseLabel}>Admin Response:</Text>
                <Text style={styles.adminResponseText}>
                  {item.adminResponse}
                </Text>
              </View>
            )}
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Smart Mess</Text>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="alert-octagon" size={18} color="#B91C1C" />
          <Text style={styles.reportBtnText}>Report Issue</Text>
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "menu" && styles.tabActive]}
          onPress={() => setActiveTab("menu")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "menu"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            Today's Menu
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "issues" && styles.tabActive]}
          onPress={() => setActiveTab("issues")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "issues"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            My Reports
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "menu" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Digital Coupon Card */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View>
                <Text style={styles.ticketLabel}>UPCOMING MEAL</Text>
                <Text style={styles.ticketMeal}>{activeMeal}</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.dot} />
                <Text style={styles.liveText}>LIVE NOW</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.ticketBody}>
              {isEating ? (
                <View style={styles.qrContainer}>
                  <QRCode value={qrToken} size={160} />
                  <Text style={styles.qrText}>Scan at Counter</Text>
                </View>
              ) : (
                <View style={styles.optInContainer}>
                  <Feather name="slash" size={50} color="#CBD5E1" />
                  <Text style={styles.optInText}>
                    You have not opted in yet.
                  </Text>
                  <Text style={styles.optInSubText}>
                    Toggle below to generate coupon.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.ticketFooter}>
              <Text style={styles.footerText}>Will you be eating?</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#4ADE80" }}
                thumbColor={isEating ? "#ffffff" : "#f4f3f4"}
                onValueChange={() => setIsEating(!isEating)}
                value={isEating}
              />
            </View>
          </View>

          {/* Menu List */}
          <Text style={styles.sectionTitle}>Today's Menu</Text>
          {TODAY_MENU.map((meal, index) => (
            <View key={index} style={styles.menuCard}>
              <View style={styles.menuHeader}>
                <View style={styles.menuIconBox}>
                  <Feather
                    name={
                      meal.type === "Breakfast"
                        ? "sun"
                        : meal.type === "Lunch"
                          ? "sun"
                          : "moon"
                    }
                    size={18}
                    color="white"
                  />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.menuType}>{meal.type}</Text>
                  <Text style={styles.menuTime}>{meal.time}</Text>
                </View>
                {meal.type === activeMeal && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>NEXT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuItems}>{meal.items}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        renderIssuesList()
      )}

      {/* --- COMPLAINT MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Mess Issue</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>What's the issue?</Text>
            <View style={styles.chipContainer}>
              {["FOOD", "SERVICE", "HYGIENE", "INFRASTRUCTURE", "OTHER"].map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setComplaintType(type as any)}
                    style={[
                      styles.chip,
                      complaintType === type
                        ? styles.chipActive
                        : styles.chipInactive,
                    ]}
                  >
                    <Text
                      style={
                        complaintType === type
                          ? styles.chipTextActive
                          : styles.chipTextInactive
                      }
                    >
                      {type.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <Text style={styles.label}>Issue Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cold Food"
              value={issueTitle}
              onChangeText={setIssueTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Rice was undercooked..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={complaintDesc}
              onChangeText={setComplaintDesc}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmitComplaint}
              disabled={submitting}
            >
              {submitting ? (
                <Text style={styles.submitBtnText}>Submitting...</Text>
              ) : (
                <Text style={styles.submitBtnText}>Submit Complaint</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reportBtnText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: {
    backgroundColor: "#B91C1C",
  },
  tabText: { fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "white" },
  tabTextInactive: { color: "#64748B" },

  // Ticket Card
  ticketCard: {
    backgroundColor: "white",
    borderRadius: 24,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  ticketHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ticketLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 1,
  },
  ticketMeal: {
    fontSize: 28,
    color: "#2563EB",
    fontWeight: "800",
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  liveText: { fontSize: 10, fontWeight: "800", color: "#16A34A" },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginHorizontal: 20,
  },
  ticketBody: {
    alignItems: "center",
    paddingVertical: 30,
    minHeight: 200,
    justifyContent: "center",
  },
  qrContainer: { alignItems: "center" },
  qrText: { marginTop: 16, color: "#64748B", fontWeight: "500" },
  optInContainer: { alignItems: "center" },
  optInText: {
    marginTop: 10,
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 16,
  },
  optInSubText: { color: "#64748B", fontSize: 12, marginTop: 4 },
  ticketFooter: {
    backgroundColor: "#2563EB",
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { color: "white", fontWeight: "600", fontSize: 16 },

  // Menu
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  menuCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  menuType: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  menuTime: { fontSize: 12, color: "#64748B", marginTop: 2 },
  menuItems: { fontSize: 14, color: "#475569", lineHeight: 20 },
  activeTag: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: { fontSize: 10, fontWeight: "700", color: "#2563EB" },

  // Issues List
  issueCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  issueTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  issueDate: { fontSize: 12, color: "#94A3B8", marginBottom: 8 },
  issueDesc: { fontSize: 14, color: "#475569", lineHeight: 20 },
  adminResponse: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  adminResponseLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 2,
  },
  adminResponseText: { fontSize: 13, color: "#334155" },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: {
    marginTop: 16,
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#0F172A" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
    marginTop: 10,
  },
  textArea: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    height: 100,
    fontSize: 16,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#B91C1C",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  submitBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Chips (Reuse)
  chipContainer: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: "#B91C1C", borderColor: "#B91C1C" },
  chipInactive: { backgroundColor: "white", borderColor: "#E2E8F0" },
  chipTextActive: { color: "white", fontWeight: "600" },
  chipTextInactive: { color: "#64748B", fontWeight: "600" },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 0,
  },
  submitBtnDisabled: {
    backgroundColor: "#DC2626", // Lighter red or different shade
    opacity: 0.7,
  },
});
