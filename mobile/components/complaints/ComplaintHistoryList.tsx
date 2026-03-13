import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  Complaint,
  StatusHistoryEntry,
  getComplaintHistory,
} from "@/src/services/complaints.service";
import { ComplaintFilter } from "./ComplaintFilter";
import { ComplaintChatModal } from "./ComplaintChatModal";

const { width, height: screenHeight } = Dimensions.get("window");

interface Props {
  complaints: Complaint[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onClose: (id: string) => void;
  onReject: (id: string) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  CREATED: { bg: "#F3F4F6", text: "#6B7280" },
  ASSIGNED: { bg: "#E0E7FF", text: "#4338CA" },
  IN_PROGRESS: { bg: "#FEF3C7", text: "#D97706" },
  RESOLVED: { bg: "#DCFCE7", text: "#15803D" },
  CLOSED: { bg: "#F1F5F9", text: "#475569" },
  ESCALATED: { bg: "#FEE2E2", text: "#B91C1C" },
  REJECTED: { bg: "#FEE2E2", text: "#B91C1C" },
  PENDING: { bg: "#FEF9C3", text: "#854D0E" },
};

const STATUS_ICONS: Record<string, string> = {
  CREATED: "file-plus",
  ASSIGNED: "user-check",
  IN_PROGRESS: "tool",
  RESOLVED: "check-circle",
  CLOSED: "lock",
  ESCALATED: "alert-triangle",
  REJECTED: "x-circle",
  PENDING: "clock",
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#E5E7EB", text: "#374151" };
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

export function ComplaintHistoryList({
  complaints,
  loading,
  refreshing,
  onRefresh,
  onClose,
  onReject,
}: Props) {
  const [viewerImages, setViewerImages] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  // Status history modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyData, setHistoryData] = useState<StatusHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyComplaintTitle, setHistoryComplaintTitle] = useState("");

  // Chat modal state
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatComplaintId, setChatComplaintId] = useState("");
  const [chatComplaintTitle, setChatComplaintTitle] = useState("");
  const [staff, setStaff] = useState("");

  const openHistory = async (complaint: Complaint) => {
    setHistoryComplaintTitle(complaint.title);
    setHistoryModalVisible(true);
    setHistoryLoading(true);
    try {
      const data = await getComplaintHistory(complaint.id);
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    // 1. Only replace the space. Do NOT add 'Z' since your DB includes '+05:30'
    const safeIso = iso.replace(" ", "T");
    const d = new Date(safeIso);

    return d.toLocaleDateString("en-IN", {
      // 2. Removed timeZone: "UTC" so the phone displays local IST time
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCardDate = (iso: string, status: string) => {
    // 1. Safety check: Replace space with 'T' and ensure it ends with 'Z' so iOS doesn't crash
    const safeIso = iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z");
    const d = new Date(safeIso);

    // 2. Force the timezone to UTC so it ignores the +5:30 IST shift
    const dateStr = d.toLocaleDateString("en-IN", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const timeStr = d.toLocaleTimeString("en-IN", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    });

    let prefix = "Filed on";
    if (status === "RESOLVED") prefix = "Resolved on";
    if (status === "CLOSED") prefix = "Closed on";

    return `${prefix} ${dateStr} • ${timeStr}`;
  };

  const formatStatus = (s: string) =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  const renderTimeline = () => {
    if (historyLoading) {
      return (
        <View style={styles.timelineLoading}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.timelineLoadingText}>Loading history…</Text>
        </View>
      );
    }

    if (historyData.length === 0) {
      return (
        <View style={styles.timelineLoading}>
          <Feather name="inbox" size={32} color="#CBD5E1" />
          <Text style={styles.timelineLoadingText}>
            No status history found.
          </Text>
        </View>
      );
    }

    // 1. Trust backend order, but add a tie-breaker for identical timestamps
    const linearHistory = [...historyData].sort((a, b) => {
      if (a.changedAt === b.changedAt) {
        if (a.newStatus === "CREATED") return -1;
        if (b.newStatus === "CREATED") return 1;
      }
      return 0; // Preserve backend order for everything else
    });

    // 2. Build nodes: "CREATED" initial + each transition's newStatus
    const initialNode = linearHistory[0]?.oldStatus
      ? [
          {
            status: linearHistory[0].oldStatus,
            changedAt: linearHistory[0].changedAt, // 👈 FIX: Now shows time for initial node
            changedBy: null as string | null,
            changedByName: null as string | null,
            changedToName: null as string | null,
            isInitial: true,
          },
        ]
      : [];

    const nodes = [
      ...initialNode,
      ...linearHistory.map((entry) => ({
        status: entry.newStatus,
        changedAt: entry.changedAt,
        changedBy: entry.changedBy,
        changedByName: entry.changedByName,
        changedToName: entry.changedToName,
        isInitial: false,
      })),
    ];

    return (
      <ScrollView
        contentContainerStyle={styles.timelineContainer}
        showsVerticalScrollIndicator={false}
      >
        {nodes.map((node, idx) => {
          const isLast = idx === nodes.length - 1;
          const colors = STATUS_COLORS[node.status] ?? {
            bg: "#E5E7EB",
            text: "#374151",
          };
          const iconName = STATUS_ICONS[node.status] ?? "circle";

          // Logic for "To: changedToName" vs "By: changedByName"
          const isAssignmentStatus =
            node.status === "ASSIGNED" || node.status === "ESCALATED";
          const displayName = isAssignmentStatus
            ? node.changedToName
            : node.changedByName;
          const displayPrefix = isAssignmentStatus ? "To: " : "By: ";

          return (
            <View key={idx} style={styles.timelineRow}>
              <View style={styles.timelineConnector}>
                <View
                  style={[styles.timelineDot, { backgroundColor: colors.text }]}
                >
                  <Feather name={iconName as any} size={14} color="white" />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
              </View>

              <View style={styles.timelineContent}>
                <View
                  style={[
                    styles.timelineStatusBadge,
                    { backgroundColor: colors.bg },
                  ]}
                >
                  <Text
                    style={[styles.timelineStatusText, { color: colors.text }]}
                  >
                    {formatStatus(node.status)}
                  </Text>
                </View>

                {node.changedAt && (
                  <View style={styles.timelineMeta}>
                    <Feather name="clock" size={12} color="#94A3B8" />
                    <Text style={styles.timelineMetaText}>
                      {formatDate(node.changedAt)}
                    </Text>
                  </View>
                )}

                {/* Enhanced logic for dynamic Name display */}
                {displayName && (
                  <View style={styles.timelineMeta}>
                    <Feather name="user" size={12} color="#94A3B8" />
                    <Text style={styles.timelineMetaText}>
                      {displayPrefix}
                      {displayName}
                    </Text>
                  </View>
                )}

                {node.isInitial && (
                  <Text style={styles.timelineMetaText}>Initial status</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const filteredData =
    filter === "ALL"
      ? complaints
      : complaints.filter((c) => c.status === filter);

  return (
    <>
      <ComplaintFilter
        filter={filter}
        setFilter={setFilter}
        options={[
          "ALL",
          "CREATED",
          "ASSIGNED",
          "IN_PROGRESS",
          "RESOLVED",
          "CLOSED",
          "REJECTED",
        ]}
      />
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No complaints found</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardInfoCol}>
                <View style={styles.badgeRow}>
                  <View style={styles.catBadge}>
                    <Text className="font-sn-pro-bold" style={styles.catText}>
                      {item.categoryName || "Issue"}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
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

            <View style={styles.dateRow}>
              <Feather name="calendar" size={12} color="#9CA3AF" />
              <Text style={styles.cardDateText}>
                {formatCardDate(item.createdAt, item.status)}
              </Text>
            </View>

            {item.staffName && (
              <Text className="font-sn-pro-medium" style={styles.assignedText}>
                Assigned to: {item.staffName}
              </Text>
            )}

            <View style={styles.actionsContainer}>
              {/* ROW 1: Accept & Reject (Only shows when RESOLVED) */}
              {item.status === "RESOLVED" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => onClose(item.id)}
                  >
                    <Feather name="check" size={16} color="white" />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => onReject(item.id)}
                  >
                    <Feather name="x" size={16} color="#B91C1C" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ROW 2: Timeline & Chat */}
              <View
                style={[
                  styles.actionRow,
                  { marginTop: item.status === "RESOLVED" ? 12 : 0 },
                ]}
              >
                <TouchableOpacity
                  style={styles.timelineListBtn}
                  onPress={() => openHistory(item)}
                >
                  <Feather name="activity" size={16} color="white" />
                  <Text style={styles.timelineListBtnText}>Timeline</Text>
                </TouchableOpacity>

                {["ASSIGNED", "IN_PROGRESS", "RESOLVED"].includes(
                  item.status,
                ) && (
                  <TouchableOpacity
                    style={styles.chatIconBtn}
                    onPress={() => {
                      setChatComplaintId(item.id);
                      setChatComplaintTitle(item.title);
                      setChatModalVisible(true);
                      setStaff(item.staffName || "Staff not assigned");
                    }}
                  >
                    <Feather name="message-square" size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
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
                    width,
                    height: screenHeight,
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

      {/* Status History Modal */}
      <Modal
        visible={historyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContent}>
            {/* Header */}
            <View style={styles.historyModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyModalTitle}>Status History</Text>
                <Text style={styles.historyModalSubtitle} numberOfLines={1}>
                  {historyComplaintTitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                style={styles.historyCloseBtn}
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Timeline */}
            {renderTimeline()}
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <ComplaintChatModal
        visible={chatModalVisible}
        complaintId={chatComplaintId}
        complaintTitle={chatComplaintTitle}
        staff={staff}
        onClose={() => setChatModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#6B7280" },

  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardDesc: { color: "#6B7280", marginTop: 2, fontSize: 13, lineHeight: 18 },
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  cardDateText: {
    fontSize: 12,
    color: "#64748B",
  },
  assignedText: {
    fontSize: 12,
    color: "#059669",
    marginTop: 8,
    fontWeight: "600",
  },
  bottomActionRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  actionsContainer: {
    marginTop: 12, // Gives some space between the text/content and the buttons
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Pushes buttons to opposite sides. Use "flex-start" with a 'gap' if you want them next to each other
    gap: 12, // Adds space between buttons if they sit next to each other
  },
  timelineListBtn: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  timelineListBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  chatIconBtn: {
    backgroundColor: "#6D28D9",
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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

  acceptBtn: {
    flex: 1,
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  acceptBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    gap: 8,
  },
  rejectBtnText: { color: "#B91C1C", fontWeight: "600", fontSize: 14 },

  // Status History Modal
  historyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  historyModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.65,
    paddingBottom: 30,
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  historyModalSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  historyCloseBtn: {
    padding: 6,
  },

  // Timeline
  timelineLoading: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  timelineLoadingText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  timelineScroll: {
    flexGrow: 1,
  },
  timelineContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 70,
  },
  timelineConnector: {
    width: 32,
    alignItems: "center",
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginTop: -2,
    marginBottom: -2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timelineStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timelineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  timelineMetaText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
