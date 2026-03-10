import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
// @ts-ignore
import { RootState } from "../../src/store/store";
import {
  getComplaintCategories,
  getMyComplaints,
  closeComplaint,
  Complaint,
  ComplaintCategory,
} from "../../src/services/complaints.service";
import { ComplaintHistoryList } from "@/components/complaints/ComplaintHistoryList";
import { ComplaintForm } from "@/components/complaints/ComplaintForm";
import { RejectResolutionModal } from "@/components/complaints/RejectResolutionModal";
import { LinearGradient } from "expo-linear-gradient";

export default function ComplaintsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<"history" | "new">(
    tab === "history" || tab === "new" ? tab : "history",
  );
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Rejection modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectComplaintId, setRejectComplaintId] = useState<string | null>(
    null,
  );

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

  const handleClose = (complaintId: string) => {
    Alert.alert(
      "Accept & Close",
      "Are you satisfied with the resolution? This will close the complaint.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Close",
          onPress: async () => {
            try {
              await closeComplaint(complaintId);
              Alert.alert("Success", "Complaint closed successfully.");
              fetchData();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message || "Failed to close complaint",
              );
            }
          },
        },
      ],
    );
  };

  const openRejectModal = (complaintId: string) => {
    setRejectComplaintId(complaintId);
    setRejectModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={["#1E1B4B", "#312E81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text className="font-sn-pro-bold" style={styles.headerTitle}>
          Complaints
        </Text>
        <Text style={styles.headerSub}>
          Raise & track your hostel complaints
        </Text>
      </LinearGradient>

      {/* Content below header */}
      <View style={styles.inner}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
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
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "new" && styles.tabActive]}
            onPress={() => setActiveTab("new")}
          >
            <Text
              className="font-sn-pro-bold"
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
          <ComplaintHistoryList
            complaints={complaints}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onClose={handleClose}
            onReject={openRejectModal}
          />
        ) : (
          <ComplaintForm
            categories={categories}
            roomId={user?.roomId}
            onSubmitSuccess={() => {
              setActiveTab("history");
              fetchData();
            }}
          />
        )}
      </View>

      <RejectResolutionModal
        visible={rejectModalVisible}
        complaintId={rejectComplaintId}
        onClose={() => setRejectModalVisible(false)}
        onSuccess={fetchData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
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
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
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
});
