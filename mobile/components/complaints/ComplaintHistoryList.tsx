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
  IN_PROGRESS: { bg: "#DBEAFE", text: "#1E40AF" },
  RESOLVED: { bg: "#DCFCE7", text: "#15803D" },
  CLOSED: { bg: "#D1FAE5", text: "#065F46" },
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
  const [viewerImage, setViewerImage] = useState<string | null>(null);
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
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

    // 1. Sort historyData by changedAt (Ascending)
    const sortedHistory = [...historyData].sort((a, b) => {
      return new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime();
    });

    // 2. Build nodes: "CREATED" initial + each transition's newStatus
    const initialNode = sortedHistory[0]?.oldStatus
      ? [
          {
            status: sortedHistory[0].oldStatus,
            changedAt: null as string | null,
            changedBy: null as string | null,
            changedByName: null as string | null,
            changedToName: null as string | null,
            isInitial: true,
          },
        ]
      : [];

    const nodes = [
      ...initialNode,
      ...sortedHistory.map((entry) => ({
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
            <View style={styles.cardHeader}>
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
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text
              className="font-sn-pro-regular"
              //numberOfLines={2}
              style={styles.cardDesc}
            >
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

            {item.staffName && (
              <Text className="font-sn-pro-medium" style={styles.assignedText}>
                Assigned to: {item.staffName}
              </Text>
            )}

            <View style={styles.buttonRow}>
              {/* View History Button */}
              <TouchableOpacity
                style={styles.actionLinkBtn}
                onPress={() => openHistory(item)}
              >
                <Feather name="git-commit" size={14} color="#4F46E5" />
                <Text style={styles.actionLinkText}>View Timeline</Text>
              </TouchableOpacity>

              {/* Chat Button */}
              {item.status != "CREATED" && (
                <TouchableOpacity
                  style={styles.actionLinkBtn}
                  onPress={() => {
                    setChatComplaintId(item.id);
                    setChatComplaintTitle(item.title);
                    setChatModalVisible(true);
                    setStaff(item.staffName || "Staff not assigned");
                  }}
                >
                  <Feather name="message-circle" size={14} color="#4F46E5" />
                  <Text style={styles.actionLinkText}>Chat</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action buttons only for RESOLVED complaints */}
            {item.status === "RESOLVED" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => onClose(item.id)}
                >
                  <Text style={styles.acceptBtnText}>Accept & Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => onReject(item.id)}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

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
  cardDate: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  cardDesc: { color: "#6B7280", marginTop: 4, fontSize: 13 },
  assignedText: {
    fontSize: 12,
    color: "#059669",
    marginTop: 8,
    fontWeight: "500",
  },

  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
  },
  actionLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "600",
  },

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

  actionRow: { flexDirection: "row", marginTop: 12, gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptBtnText: { color: "white", fontWeight: "600", fontSize: 13 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectBtnText: { color: "#B91C1C", fontWeight: "600", fontSize: 13 },

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
