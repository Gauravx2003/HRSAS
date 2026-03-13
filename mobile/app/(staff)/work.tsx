import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ComplaintFilter } from "../../components/complaints/ComplaintFilter";
import { ComplaintChatModal } from "../../components/complaints/ComplaintChatModal";
import {
  getAssignedComplaints,
  updateComplaintStatus,
  getStaffProfile,
  AssignedComplaint,
} from "../../src/services/staff.service";

export default function WorkScreen() {
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [complainee, setComplainee] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED"
  >("ALL");

  const [isActive, setIsActive] = useState(true);

  // Chat modal state
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatComplaintId, setChatComplaintId] = useState("");
  const [chatComplaintTitle, setChatComplaintTitle] = useState("");

  // Fullscreen Image Viewer
  const [viewerImages, setViewerImages] = useState<any[] | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [complaintsData, profileData] = await Promise.all([
        getAssignedComplaints(filter === "ALL" ? undefined : filter),
        getStaffProfile(),
      ]);
      setComplaints(complaintsData);
      setIsActive(profileData.isActive);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch work data");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [filter]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: "IN_PROGRESS" | "RESOLVED",
  ) => {
    if (!isActive) {
      Alert.alert(
        "Status Inactive",
        "You are currently marked as inactive. Please switch to 'On Duty' in the Dashboard to perform actions.",
      );
      return;
    }

    try {
      setUpdatingId(id);
      await updateComplaintStatus(id, newStatus);
      // Optimistic update or refetch
      fetchData();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderItem = ({ item }: { item: AssignedComplaint }) => {
    const isEscalated = item.status === "ESCALATED";

    return (
      <View style={[styles.card, isEscalated && styles.cardEscalated]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardInfoCol}>
            <View style={styles.badgeRow}>
              <View style={styles.catBadge}>
                <Text className="font-sn-pro-bold" style={styles.catText}>
                  {item.category || "Issue"}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.status === "ASSIGNED"
                    ? styles.bgPurple
                    : item.status === "IN_PROGRESS"
                      ? styles.bgBlue
                      : item.status === "RESOLVED"
                        ? styles.bgGreen
                        : item.status === "ESCALATED"
                          ? styles.bgRed
                          : styles.bgGray,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.status === "ASSIGNED"
                      ? styles.textPurple
                      : item.status === "IN_PROGRESS"
                        ? styles.textBlue
                        : item.status === "RESOLVED"
                          ? styles.textGreen
                          : item.status === "ESCALATED"
                            ? styles.textRed
                            : styles.textGray,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  item.priority === "HIGH"
                    ? styles.bgRed
                    : item.priority === "MEDIUM"
                      ? styles.bgYellow
                      : styles.bgGreen,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    item.priority === "HIGH"
                      ? styles.textRed
                      : item.priority === "MEDIUM"
                        ? styles.textYellow
                        : styles.textGreen,
                  ]}
                >
                  {item.priority}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Text style={styles.cardId}>#{item.id.slice(0, 8)}</Text>
            </View>

            <Text className="font-sn-pro-bold" style={styles.cardTitle}>
              {item.title}
            </Text>
            <Text
              className="font-sn-pro-regular"
              style={styles.cardDesc}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          </View>
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.cardImageCol}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setViewerImages(item.attachments || null);
                }}
                style={styles.stackPreviewContainer}
              >
                {item.attachments.slice(0, 3).map((att, i, arr) => (
                  <Image
                    key={att.id}
                    source={{ uri: att.fileURL }}
                    style={[
                      styles.stackImage,
                      { zIndex: 10 - i, top: i * 4, left: i * 4 },
                    ]}
                  />
                ))}
                {item.attachments.length > 1 && (
                  <View
                    style={[
                      styles.stackImage,
                      {
                        zIndex: 11,
                        top: 0,
                        left: 0,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      +{item.attachments.length - 1}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View>
          <View style={styles.infoRow}>
            <Feather name="clock" size={14} color="#6B7280" />
            <Text style={styles.infoText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>

            {item.name && (
              <>
                <View style={styles.dot} />
                <Feather name="user" size={14} color="#6B7280" />
                <Text style={styles.infoText}>{item.name}</Text>
              </>
            )}
          </View>
          {/* Second Row: Block & Room */}
          <View style={styles.infoRow}>
            {item.block && item.room && (
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={14} color="#6B7280" />
                <Text style={styles.infoText}>
                  {item.block} - {item.room}
                </Text>
              </View>
            )}
            <>
              <View style={styles.dot} />
              <Feather name="phone" size={14} color="#6B7280" />
              <Text style={styles.infoText}>{item.phone}</Text>
            </>
          </View>
        </View>
        {/* Actions */}
        <View style={styles.actionContainer}>
          {item.status === "ASSIGNED" && (
            <TouchableOpacity
              style={[
                styles.actionBtnPrimary,
                !isActive && styles.actionBtnDisabled,
              ]}
              disabled={updatingId === item.id || !isActive}
              onPress={() => handleStatusUpdate(item.id, "IN_PROGRESS")}
            >
              {updatingId === item.id ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Start Work</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status === "IN_PROGRESS" && (
            <TouchableOpacity
              style={[
                styles.actionBtnSuccess,
                !isActive && styles.actionBtnDisabled,
              ]}
              disabled={updatingId === item.id || !isActive}
              onPress={() => handleStatusUpdate(item.id, "RESOLVED")}
            >
              {updatingId === item.id ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Mark Resolved</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status === "ESCALATED" && (
            <View style={styles.escalatedBox}>
              <Feather name="alert-triangle" size={16} color="#B91C1C" />
              <Text style={styles.escalatedText}>
                Escalated - Contact Admin
              </Text>
            </View>
          )}

          {item.status === "RESOLVED" && (
            <View style={styles.resolvedBox}>
              <Feather name="check" size={16} color="#15803D" />
              <Text style={styles.resolvedText}>Completed</Text>
            </View>
          )}
        </View>
        {/* Chat Button for Staff */}
        {item.status !== "ESCALATED" && item.status !== "CLOSED" && (
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={() => {
              setChatComplaintId(item.id);
              setChatComplaintTitle(item.title);
              setComplainee(item.name);
              setChatModalVisible(true);
            }}
          >
            <Feather name="message-circle" size={16} color="white" />
            <Text style={styles.chatActionText}>Open Chat</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text className="font-sn-pro-bold" style={styles.headerTitle}>
          Assigned Work
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
          paddingHorizontal: 20,
        }}
      >
        <ComplaintFilter filter={filter} setFilter={setFilter} />
      </View>

      {!isActive && !loading && (
        <View style={styles.inactiveBanner}>
          <Feather name="pause-circle" size={16} color="#B91C1C" />
          <Text style={styles.inactiveText}>
            You are currently inactive. Switch to "On Duty" to perform actions.
          </Text>
        </View>
      )}

      <FlatList
        data={complaints}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 5, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No assigned complaints.</Text>
            </View>
          ) : null
        }
      />

      {/* Fullscreen Image Viewer */}
      <Modal
        visible={!!viewerImages}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImages(null)}
      >
        <View style={styles.imageViewerBackdrop}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setViewerImages(null)}
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          {viewerImages && (
            <FlatList
              data={viewerImages}
              keyExtractor={(item, index) => item.id || index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: Dimensions.get("window").width,
                    height: Dimensions.get("window").height,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: item.fileURL }}
                    style={styles.imageViewerFull}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Chat Modal */}
      <ComplaintChatModal
        visible={chatModalVisible}
        complaintId={chatComplaintId}
        complaintTitle={chatComplaintTitle}
        staff={complainee}
        onClose={() => setChatModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 26, color: "#111827" },

  // Staff Complaints Card Layout Matches ComplaintHistoryList
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardEscalated: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardInfoCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  catBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catText: {
    color: "#7E22CE",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardId: { fontSize: 12, color: "#9CA3AF", fontFamily: "monospace" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardDesc: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardImageCol: {
    width: 68,
    height: 68,
  },
  stackPreviewContainer: {
    width: 68,
    height: 68,
  },
  stackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    position: "absolute",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 16,
  },
  infoText: { fontSize: 12, color: "#6B7280" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },

  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  actionBtnPrimary: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnSuccess: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },

  escalatedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
  },
  escalatedText: { color: "#B91C1C", fontWeight: "600", fontSize: 14 },

  resolvedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: 8,
  },
  resolvedText: { color: "#15803D", fontWeight: "600", fontSize: 14 },

  chatActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: "#4F46E5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  chatActionText: { color: "white", fontWeight: "600", fontSize: 14 },

  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { color: "#9CA3AF", marginTop: 16, fontSize: 16 },

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
    width: Dimensions.get("window").width - 32,
    height: Dimensions.get("window").width - 32,
    borderRadius: 12,
  },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  priorityText: { fontSize: 10, fontWeight: "700" },

  bgPurple: { backgroundColor: "#F3E8FF" },
  textPurple: { color: "#7E22CE" },
  bgBlue: { backgroundColor: "#EFF6FF" },
  textBlue: { color: "#2563EB" },
  bgGreen: { backgroundColor: "#ECFDF5" },
  textGreen: { color: "#059669" },
  bgRed: { backgroundColor: "#FEF2F2" },
  textRed: { color: "#DC2626" },
  bgYellow: { backgroundColor: "#FEFCE8" },
  textYellow: { color: "#CA8A04" },
  bgGray: { backgroundColor: "#F3F4F6" },
  textGray: { color: "#4B5563" },
  actionBtnDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  inactiveBanner: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  inactiveText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },
});
