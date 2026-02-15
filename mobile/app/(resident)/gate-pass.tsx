import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  createGatePass,
  getMyPasses,
  GatePassRequest,
} from "../../src/services/gatePass.service";
import { useFocusEffect } from "expo-router";

export default function GatePassScreen() {
  const [activeTab, setActiveTab] = useState<"request" | "history">("request");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Request Form State
  const [requestType, setRequestType] = useState<
    "ENTRY" | "EXIT" | "OVERNIGHT"
  >("EXIT");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");

  // Date/Time Pickers State
  const [outDate, setOutDate] = useState<Date>(new Date());
  const [inDate, setInDate] = useState<Date>(new Date());

  // Picker visibility controls
  const [showOutPicker, setShowOutPicker] = useState(false);
  const [showInPicker, setShowInPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("time");

  // Data State
  const [history, setHistory] = useState<GatePassRequest[]>([]);
  const [activePass, setActivePass] = useState<GatePassRequest | null>(null);
  const [upcomingPasses, setUpcomingPasses] = useState<GatePassRequest[]>([]);
  const [showQR, setShowQR] = useState(false);

  // --- API FETCHING ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getMyPasses();

      // Sort history by created newest first
      const sortedHistory = [...data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setHistory(sortedHistory);

      // Determine Hero Pass (Priority Queue)
      // Candidates: APPROVED or ACTIVE, and NOT expired (inTime > now)
      const now = new Date();
      const candidates = data.filter(
        (p) =>
          (p.status === "APPROVED" || p.status === "ACTIVE") &&
          new Date(p.inTime) > now,
      );

      let hero: GatePassRequest | null = null;

      // Priority 1: Status = ACTIVE (Student is outside)
      const active = candidates.find((p) => p.status === "ACTIVE");
      if (active) {
        hero = active;
      } else {
        // Priority 2: Status = APPROVED & Date = TODAY
        // Filter those where outTime is today
        const today = candidates.filter((p) => {
          const outDate = new Date(p.outTime);
          return outDate.toDateString() === now.toDateString();
        });

        // If multiple, pick earliest outTime
        if (today.length > 0) {
          today.sort(
            (a, b) =>
              new Date(a.outTime).getTime() - new Date(b.outTime).getTime(),
          );
          hero = today[0];
        }
      }

      setActivePass(hero);

      // Priority 3 / Upcoming
      // All other candidates that are NOT the hero
      // Show APPROVED passes that are in the future (or later today)
      let upcoming = candidates.filter(
        (p) => p.id !== hero?.id && p.status === "APPROVED",
      );

      // Sort upcoming by outTime ascending (earliest first)
      upcoming.sort(
        (a, b) => new Date(a.outTime).getTime() - new Date(b.outTime).getTime(),
      );

      setUpcomingPasses(upcoming);
    } catch (error) {
      console.error("Failed to fetch passes:", error);
      Alert.alert("Error", "Could not load gate pass history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- DATE/TIME HELPERS ---
  const updateDate = (current: Date, next: Date) => {
    const newDate = new Date(current);
    newDate.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
    return newDate;
  };

  const updateTime = (current: Date, next: Date) => {
    const newDate = new Date(current);
    newDate.setHours(next.getHours());
    newDate.setMinutes(next.getMinutes());
    return newDate;
  };

  const onChangeOut = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowOutPicker(false);
    if (!selectedDate) return;

    if (pickerMode === "date") {
      setOutDate((prev) => updateDate(prev, selectedDate));
    } else {
      setOutDate((prev) => updateTime(prev, selectedDate));
    }
  };

  const onChangeIn = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowInPicker(false);
    if (!selectedDate) return;

    if (pickerMode === "date") {
      setInDate((prev) => updateDate(prev, selectedDate));
    } else {
      setInDate((prev) => updateTime(prev, selectedDate));
    }
  };

  const showOutDatepicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    setShowOutPicker(true);
  };

  const showInDatepicker = (mode: "date" | "time") => {
    setPickerMode(mode);
    setShowInPicker(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- HANDLE SUBMIT ---
  const handleRequest = async () => {
    if (!reason || !location) {
      Alert.alert("Missing Details", "Please fill in location and reason.");
      return;
    }

    try {
      setLoading(true);

      // Construct Payload
      const payload: any = {
        type: requestType,
        reason,
        location,
      };

      if (requestType === "EXIT") {
        payload.outTime = outDate.toISOString();
        // Backend handles default inTime if not sent
      } else if (requestType === "ENTRY") {
        payload.inTime = inDate.toISOString();
        // Backend handles outTime as NOW
      } else if (requestType === "OVERNIGHT") {
        payload.outTime = outDate.toISOString();
        payload.inTime = inDate.toISOString();
      }

      await createGatePass(payload);

      Alert.alert("Success", "Gate pass requested successfully", [
        {
          text: "OK",
          onPress: () => {
            setReason("");
            setLocation("");
            setActiveTab("history");
            fetchData();
          },
        },
      ]);
    } catch (error) {
      console.error("Request Failed:", error);
      Alert.alert("Error", "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderHistoryItem = ({ item }: { item: GatePassRequest }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={styles.historyIcon}>
          <Feather
            name={
              item.type === "ENTRY"
                ? "log-in"
                : item.type === "EXIT"
                  ? "log-out"
                  : "moon"
            }
            size={18}
            color="#64748B"
          />
        </View>
        <View>
          <Text style={styles.historyTitle}>
            {item.type === "ENTRY"
              ? "Late Entry"
              : item.type === "EXIT"
                ? "Late Exit"
                : "Overnight Stay"}
          </Text>
          <Text style={styles.historyDate}>
            {new Date(item.createdAt).toLocaleDateString()} • {item.location}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.statusBadge,
          item.status === "APPROVED" || item.status === "ACTIVE"
            ? styles.bgGreen
            : item.status === "REJECTED"
              ? styles.bgRed
              : item.status === "PENDING"
                ? styles.bgYellow
                : styles.bgGray,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            item.status === "APPROVED" || item.status === "ACTIVE"
              ? styles.textGreen
              : item.status === "REJECTED"
                ? styles.textRed
                : item.status === "PENDING"
                  ? styles.textYellow
                  : styles.textGray,
          ]}
        >
          {item.status}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Gate Pass</Text>

      {/* 1. ACTIVE PASS CARD (Priority 1 & 2) */}
      {activePass && (
        <View style={styles.activeCard}>
          <View style={styles.cardHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveText}>
                {activePass.status === "ACTIVE"
                  ? "ACTIVE NOW"
                  : "READY FOR EXIT"}
              </Text>
            </View>
            <Text style={styles.expiryText}>
              Valid until{" "}
              {new Date(activePass.inTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          <Text style={styles.passType}>
            {activePass.type === "ENTRY"
              ? "Late Entry"
              : activePass.type === "EXIT"
                ? "Late Exit"
                : "Overnight Stay"}
          </Text>
          <Text style={styles.passDetail}>
            {activePass.location} • {activePass.reason}
          </Text>

          {activePass.qrToken && (
            <TouchableOpacity
              style={styles.showQrBtn}
              onPress={() => setShowQR(true)}
            >
              <Feather
                name="maximize"
                size={20}
                color="#2563EB"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.showQrText}>Show Gate QR</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* UPCOMING PASSES (Priority 3) */}
      {upcomingPasses.length > 0 && (
        <View style={styles.upcomingContainer}>
          <Text style={styles.sectionTitle}>Upcoming Passes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {upcomingPasses.map((pass) => (
              <View key={pass.id} style={styles.upcomingCard}>
                <View style={styles.upcomingHeader}>
                  <Text style={styles.upcomingType}>
                    {pass.type === "ENTRY"
                      ? "Entry"
                      : pass.type === "EXIT"
                        ? "Exit"
                        : "Overnight"}
                  </Text>
                  <Text style={styles.upcomingTime}>
                    {new Date(pass.outTime).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <Text style={styles.upcomingLocation} numberOfLines={1}>
                  {pass.location}
                </Text>
                <Text style={styles.upcomingStatus}>APPROVED</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 2. TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "request" && styles.tabActive]}
          onPress={() => setActiveTab("request")}
        >
          <Text
            style={
              activeTab === "request"
                ? styles.tabTextActive
                : styles.tabTextInactive
            }
          >
            New Request
          </Text>
        </TouchableOpacity>
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
      </View>

      {/* CONTENT AREA */}
      {activeTab === "request" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            {/* REQUEST TYPE SELECTOR */}
            <Text style={styles.label}>Request Type</Text>
            <View style={styles.typeContainer}>
              {(["ENTRY", "EXIT", "OVERNIGHT"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    requestType === type && styles.typeChipActive,
                  ]}
                  onPress={() => setRequestType(type)}
                >
                  <Text
                    style={
                      requestType === type
                        ? styles.typeTextActive
                        : styles.typeTextInactive
                    }
                  >
                    {type === "ENTRY"
                      ? "Late Entry"
                      : type === "EXIT"
                        ? "Late Exit"
                        : "Overnight"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Where are you going?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Market / Home / Library"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.label}>Reason</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="e.g. Buying study material"
              multiline
              value={reason}
              onChangeText={setReason}
            />

            {/* CONDITIONAL DATE/TIME PICKERS */}
            <View style={styles.dateSection}>
              {/* EXIT TIME (Visible for EXIT & OVERNIGHT) */}
              {(requestType === "EXIT" || requestType === "OVERNIGHT") && (
                <View style={styles.dateTimeRow}>
                  <Text style={styles.label}>
                    {requestType === "OVERNIGHT" ? "Leaving At" : "Exit Time"}
                  </Text>
                  <View style={styles.pickerRow}>
                    <TouchableOpacity
                      onPress={() => showOutDatepicker("date")}
                      style={[styles.timeBox, { flex: 1, marginRight: 8 }]}
                    >
                      <Feather name="calendar" size={16} color="#64748B" />
                      <Text style={styles.timeText}>{formatDate(outDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showOutDatepicker("time")}
                      style={[styles.timeBox, { flex: 1 }]}
                    >
                      <Feather name="clock" size={16} color="#64748B" />
                      <Text style={styles.timeText}>{formatTime(outDate)}</Text>
                    </TouchableOpacity>
                  </View>
                  {showOutPicker && (
                    <DateTimePicker
                      value={outDate}
                      mode={pickerMode}
                      is24Hour={false}
                      display="default"
                      onChange={onChangeOut}
                    />
                  )}
                </View>
              )}

              {/* ENTRY TIME (Visible for ENTRY & OVERNIGHT) */}
              {(requestType === "ENTRY" || requestType === "OVERNIGHT") && (
                <View style={styles.dateTimeRow}>
                  <Text style={styles.label}>
                    {requestType === "OVERNIGHT" ? "Return At" : "Entry Time"}
                  </Text>
                  <View style={styles.pickerRow}>
                    <TouchableOpacity
                      onPress={() => showInDatepicker("date")}
                      style={[styles.timeBox, { flex: 1, marginRight: 8 }]}
                    >
                      <Feather name="calendar" size={16} color="#64748B" />
                      <Text style={styles.timeText}>{formatDate(inDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showInDatepicker("time")}
                      style={[styles.timeBox, { flex: 1 }]}
                    >
                      <Feather name="clock" size={16} color="#64748B" />
                      <Text style={styles.timeText}>{formatTime(inDate)}</Text>
                    </TouchableOpacity>
                  </View>
                  {showInPicker && (
                    <DateTimePicker
                      value={inDate}
                      mode={pickerMode}
                      is24Hour={false}
                      display="default"
                      onChange={onChangeIn}
                    />
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>Request Permission</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* HISTORY LIST */
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Feather name="list" size={40} color="#CBD5E1" />
              <Text style={{ color: "#94A3B8", marginTop: 10 }}>
                No past requests
              </Text>
            </View>
          }
        />
      )}

      {/* 3. QR MODAL */}
      <Modal visible={showQR} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowQR(false)}
            >
              <Feather name="x" size={24} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Gate Pass QR</Text>
            <Text style={styles.modalSub}>Show this to the security guard</Text>

            <View style={styles.qrBox}>
              {activePass?.qrToken ? (
                <QRCode value={activePass.qrToken} size={220} />
              ) : (
                <Text>No QR Code Available</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Feather name="map-pin" size={20} color="#64748B" />
              <Text style={styles.infoText}>{activePass?.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="clock" size={20} color="#64748B" />
              <Text style={styles.infoText}>
                Valid till{" "}
                {activePass &&
                  new Date(activePass.inTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Text>
            </View>

            <View style={styles.securityBadge}>
              <Feather name="shield" size={16} color="#15803D" />
              <Text style={styles.securityText}>APPROVED BY WARDEN</Text>
            </View>
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
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
  },

  // Active Card
  activeCard: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
    marginRight: 6,
  },
  liveText: { color: "#4ADE80", fontSize: 10, fontWeight: "800" },
  expiryText: { color: "#BFDBFE", fontSize: 12, fontWeight: "600" },
  passType: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  passDetail: { color: "#DBEAFE", fontSize: 14, marginBottom: 16 },
  showQrBtn: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  showQrText: { color: "#2563EB", fontWeight: "bold", fontSize: 16 },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
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
  tabTextActive: { fontWeight: "700", color: "#0F172A" },
  tabTextInactive: { fontWeight: "600", color: "#64748B" },

  // Form
  formCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: "#0F172A",
  },
  row: { flexDirection: "row", marginBottom: 20 },
  timeBox: {
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timeText: { fontWeight: "700", color: "#0F172A" },
  submitBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Type Selector
  typeContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  typeChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  typeTextActive: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
  },
  typeTextInactive: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 12,
  },

  // History
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  historyLeft: { flexDirection: "row", alignItems: "center" },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  historyTitle: { fontWeight: "700", color: "#0F172A", fontSize: 15 },
  historyDate: { color: "#64748B", fontSize: 12 },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bgGreen: { backgroundColor: "#DCFCE7" },
  bgRed: { backgroundColor: "#FEE2E2" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  bgGray: { backgroundColor: "#F1F5F9" },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textGreen: { color: "#15803D" },
  textRed: { color: "#B91C1C" },
  textYellow: { color: "#D97706" },
  textGray: { color: "#94A3B8" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  closeBtn: { position: "absolute", right: 20, top: 20, zIndex: 10 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 10,
  },
  modalSub: { color: "#64748B", marginBottom: 24 },
  qrBox: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  securityText: {
    color: "#15803D",
    fontWeight: "800",
    fontSize: 10,
    marginLeft: 6,
  },

  // Date Section
  dateSection: {
    marginTop: 8,
  },
  dateTimeRow: {
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  // Upcoming Section
  upcomingContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  upcomingCard: {
    backgroundColor: "white",
    width: 200,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  upcomingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  upcomingType: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  upcomingTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  upcomingLocation: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  upcomingStatus: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    marginTop: 4,
  },
});
