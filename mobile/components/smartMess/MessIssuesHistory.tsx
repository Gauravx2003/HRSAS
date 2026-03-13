import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { MessIssue } from "@/src/services/mess.service"; // Adjust path if needed
import { ComplaintFilter } from "../complaints/ComplaintFilter";

const { width, height: screenHeight } = Dimensions.get("window");

interface Props {
  issues: MessIssue[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function MessIssueHistoryList({
  issues,
  loading,
  refreshing,
  onRefresh,
}: Props) {
  const [viewerImages, setViewerImages] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const formatCardDate = (iso: string, status: string) => {
    const safeIso = iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z");
    const d = new Date(safeIso);

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

    let prefix = "Reported on";
    if (status === "RESOLVED") prefix = "Resolved on";
    if (status === "CLOSED") prefix = "Closed on";
    return `${prefix} ${dateStr} • ${timeStr}`;
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

  if (loading && !refreshing) {
    return (
      <ActivityIndicator
        size="large"
        color="#B91C1C"
        style={{ marginTop: 40 }}
      />
    );
  }

  const filteredData =
    filter === "ALL" ? issues : issues.filter((i) => i.status === filter);

  return (
    <>
      <ComplaintFilter
        filter={filter}
        setFilter={setFilter}
        options={["ALL", "OPEN", "IN_REVIEW", "REJECTED", "RESOLVED"]}
      />
      <FlatList
        data={filteredData}
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
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardInfoCol}>
                <View style={styles.badgeRow}>
                  <View style={styles.catBadge}>
                    <Text className="font-sn-pro-bold" style={styles.catText}>
                      {item.category || "Issue"}
                    </Text>
                  </View>
                  {renderStatusBadge(item.status)}
                </View>
                <Text className="font-sn-pro-bold" style={styles.cardTitle}>
                  {item.issueTitle}
                </Text>
                <Text
                  className="font-sn-pro-regular"
                  style={styles.cardDesc}
                  numberOfLines={2}
                >
                  {item.issueDescription}
                </Text>
              </View>
              {item.attachments && item.attachments.length > 0 && (
                <View style={styles.cardImageCol}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setViewerImages(item.attachments || null)}
                    style={styles.stackPreviewContainer}
                  >
                    {item.attachments.slice(0, 3).map((att, i) => (
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
    </>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: {
    marginTop: 16,
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },
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
  cardInfoCol: { flex: 1 },
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
  cardImageCol: { width: 68, height: 68 },
  stackPreviewContainer: { width: 68, height: 68 },
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
  cardDateText: { fontSize: 12, color: "#64748B" },
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
