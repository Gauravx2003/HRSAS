import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  visitorsService,
  VisitorRequest,
} from "../../src/services/visitors.service";
import { useFocusEffect } from "expo-router";

export default function VisitorScreen() {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<VisitorRequest[]>([]);

  // Form State
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [purpose, setPurpose] = useState("");

  // Controls whether the picker is visible
  const [show, setShow] = useState(false);

  // Controls whether we are picking a 'date' or a 'time'
  const [mode, setMode] = useState<"date" | "time">("date");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await visitorsService.getMyRequests();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch visitor history:", error);
      Alert.alert("Error", "Could not load visitor history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "history") {
        fetchHistory();
      }
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === "ios");

    if (selectedDate) {
      setDate(selectedDate);
    }

    if (Platform.OS === "android") {
      setShow(false);
    }
  };

  const showMode = (currentMode: "date" | "time") => {
    setShow(true);
    setMode(currentMode);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString();
  };

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSubmit = async () => {
    if (!visitorName || !relation || !date) {
      Alert.alert(
        "Missing Details",
        "Please fill in the visitor's name, relation and date.",
      );
      return;
    }

    try {
      setLoading(true);
      const newRequest = await visitorsService.createRequest({
        visitorName,
        visitorPhone: "0000000000", // Default or add input field
        relation,
        purpose: purpose || "Visit",
        visitDate: date.toISOString(),
      });

      Alert.alert(
        "Request Sent",
        `Gate pass request for ${visitorName} has been sent. Entry Code: ${newRequest.entryCode}`,
        [
          {
            text: "OK",
            onPress: () => {
              setVisitorName("");
              setRelation("");
              setDate(null);
              setPurpose("");
              setActiveTab("history");
            },
          },
        ],
      );
    } catch (error) {
      console.error("Failed to create request:", error);
      Alert.alert("Error", "Failed to create visitor request");
    } finally {
      setLoading(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: VisitorRequest }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyLeft}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {item.visitorName?.charAt(0) || "?"}
          </Text>
        </View>
        <View>
          <Text style={styles.historyName}>{item.visitorName}</Text>
          <Text style={styles.historyRelation}>
            {item.relation} • {new Date(item.visitDate).toLocaleDateString()}
          </Text>
          <Text style={styles.entryCode}>Code: {item.entryCode}</Text>
        </View>
      </View>
      <View
        style={[
          styles.statusBadge,
          item.status === "APPROVED" || item.status === "COMPLETED"
            ? styles.bgGreen
            : item.status === "REJECTED"
              ? styles.bgRed
              : styles.bgYellow,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            item.status === "APPROVED" || item.status === "COMPLETED"
              ? styles.textGreen
              : item.status === "REJECTED"
                ? styles.textRed
                : styles.textYellow,
          ]}
        >
          {item.status}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Visitors</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
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
            Invite Visitor
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
            Logbook
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "new" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <View style={styles.infoBox}>
              <Feather
                name="info"
                size={16}
                color="#2563EB"
                style={{ marginTop: 2 }}
              />
              <Text style={styles.infoText}>
                Visitors are allowed only between 9 AM - 6 PM on weekends.
                Parents can visit anytime with prior approval.
              </Text>
            </View>

            <Text style={styles.label}>Visitor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Daware"
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={styles.label}>Visitor Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={styles.label}>Relationship</Text>
            <View style={styles.chipContainer}>
              {["Father", "Mother", "Sibling", "Friend", "Other"].map((rel) => (
                <TouchableOpacity
                  key={rel}
                  onPress={() => setRelation(rel)}
                  style={[
                    styles.chip,
                    relation === rel ? styles.chipActive : styles.chipInactive,
                  ]}
                >
                  <Text
                    style={
                      relation === rel
                        ? styles.chipTextActive
                        : styles.chipTextInactive
                    }
                  >
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.container}>
              <View style={styles.row}>
                {/* DATE INPUT */}
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Date</Text>
                  <TouchableOpacity
                    onPress={() => showMode("date")}
                    style={styles.input}
                  >
                    <Text style={styles.inputText}>
                      {formatDate(date) || "DD/MM/YYYY"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* TIME INPUT */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Time</Text>
                  <TouchableOpacity
                    onPress={() => showMode("time")}
                    style={styles.input}
                  >
                    <Text style={styles.inputText}>
                      {formatTime(date) || "10:00 AM"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* THE PICKER COMPONENT */}
              {show && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={date || new Date()}
                  mode={mode}
                  is24Hour={false}
                  onChange={onChange}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                />
              )}
            </View>

            <Text style={styles.label}>Purpose of Visit</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="e.g. Dropping off luggage"
              multiline
              value={purpose}
              onChangeText={setPurpose}
            />

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>Generate Pass</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              {loading ? (
                <ActivityIndicator size="large" color="#2563EB" />
              ) : (
                <>
                  <Feather name="users" size={40} color="#CBD5E1" />
                  <Text style={{ color: "#94A3B8", marginTop: 10 }}>
                    No past visitors
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputText: {
    fontSize: 16,
    color: "#000",
  },
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
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: "#1E40AF",
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 5,
    height: 50,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
    color: "#0F172A",
    justifyContent: "center",
  },

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
  chipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  chipInactive: { backgroundColor: "white", borderColor: "#E2E8F0" },
  chipTextActive: { color: "white", fontWeight: "600" },
  chipTextInactive: { color: "#64748B", fontWeight: "600" },

  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // History List
  historyCard: {
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
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#2563EB", fontWeight: "bold", fontSize: 18 },
  historyName: { fontWeight: "700", color: "#0F172A", fontSize: 15 },
  historyRelation: { color: "#64748B", fontSize: 12, marginTop: 2 },
  entryCode: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bgGreen: { backgroundColor: "#DCFCE7" },
  bgRed: { backgroundColor: "#FEE2E2" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "800" },
  textGreen: { color: "#15803D" },
  textRed: { color: "#B91C1C" },
  textYellow: { color: "#D97706" },
});
