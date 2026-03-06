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
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";

import {
  messService,
  MessIssue,
  MessMenu,
} from "../../src/services/mess.service";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// ... (Menu Data kept same)
// Removed static TODAY_MENU

export default function MessScreen() {
  // Tabs
  const [activeTab, setActiveTab] = useState<"menu" | "issues">("menu");

  // State
  const [menu, setMenu] = useState<MessMenu[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Fullscreen Image Viewer
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  // State for Opt-In interaction
  const [optingIn, setOptingIn] = useState(false);

  // Determine Active Meal for the Big Card
  // Logic: First meal that hasn't ended.
  // We can benefit from the logic used in the list, but let's re-calculate cleanly.
  const activeMealIndex = menu.findIndex((m) => {
    const sTime = new Date(m.servingTime);
    const eTime = new Date(sTime);
    eTime.setHours(sTime.getHours() + 2);
    return new Date() < eTime;
  });

  // If no upcoming meal (end of day), maybe show the last one or empty?
  // Let's show the first upcoming, or the last one if all done.
  const targetMeal =
    activeMealIndex !== -1
      ? menu[activeMealIndex]
      : menu.length > 0
        ? menu[menu.length - 1]
        : null;

  const isOptedIn =
    targetMeal?.status === "OPTED_IN" || targetMeal?.status === "SCANNED";
  const qrToken = targetMeal?.qrToken || "";

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

  const fetchMenu = useCallback(async () => {
    try {
      setLoadingMenu(true);
      const data = await messService.getDailyMenu();

      const sorted = [...data].sort(
        (a, b) =>
          new Date(a.servingTime).getTime() - new Date(b.servingTime).getTime(),
      );

      setMenu(sorted);
    } catch (error) {
      console.error("Failed to fetch menu", error);
      Alert.alert("Error", "Failed to load menu");
    } finally {
      setLoadingMenu(false);
      setRefreshing(false);
    }
  }, []);

  // Replace useEffect with this:
  useFocusEffect(
    useCallback(() => {
      fetchMenu();

      // Optional: Return a cleanup function if you need to
      // cancel subscriptions or reset state when the screen loses focus
      return () => {
        // console.log('Screen unfocused');
      };
    }, [fetchMenu]),
  );

  useEffect(() => {
    if (activeTab === "issues") {
      fetchIssues();
    }
  }, [activeTab, fetchIssues]);

  const handleOptInToggle = async (val: boolean) => {
    if (!targetMeal) return;

    // Toggle OFF -> Opt-Out
    if (!val) {
      // Logic for Cancellation
      // We can check cutoff locally for instant feedback, but backend is source of truth.
      // Let's try to cancel via API.

      Alert.alert(
        "Cancel Booking?",
        "Are you sure you want to cancel this meal?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              try {
                setOptingIn(true);
                await messService.optOutForMeal(targetMeal.id);
                await fetchMenu(); // Refresh state
                Alert.alert("Cancelled", "Meal booking cancelled.");
              } catch (err: any) {
                Alert.alert(
                  "Failed",
                  err.response?.data?.message || "Could not cancel booking",
                );
                // Revert switch visually if needed, but state comes from prop/menu so fetchMenu handles it.
              } finally {
                setOptingIn(false);
              }
            },
          },
        ],
      );
      return;
    }

    // Toggle ON -> Opt-In
    try {
      setOptingIn(true);
      await messService.optInForMeal(targetMeal.id);
      await fetchMenu();
      Alert.alert("Success", "Meal booked successfully! 🍔");
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err.response?.data?.message || "Could not book meal",
      );
    } finally {
      setOptingIn(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
    if (activeTab === "issues") fetchIssues();
  };

  const pickImages = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert("Limit", "You can attach up to 5 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedImages.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setSelectedImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitComplaint = async () => {
    if (!issueTitle.trim() || !complaintDesc.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      setSubmitting(true);
      const newIssue = await messService.createIssue({
        issueTitle,
        issueDescription: complaintDesc,
        category: complaintType,
      });

      // Upload attachments if any
      if (selectedImages.length > 0 && newIssue?.id) {
        try {
          await messService.uploadIssueAttachments(newIssue.id, selectedImages);
        } catch (uploadErr) {
          console.error("Failed to upload attachments:", uploadErr);
          // Issue was still created; don't block
        }
      }

      setModalVisible(false);
      setIssueTitle("");
      setComplaintDesc("");
      setSelectedImages([]);
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

  // ─── Fullscreen Image Viewer ───
  const renderImageViewer = () => (
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
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <LinearGradient
        colors={["#1E1B4B", "#312E81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sn-pro-bold" style={styles.headerTitle}>
            Smart Mess
          </Text>
          <Text style={styles.headerSub}>Today's meals & your reports</Text>
        </View>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="alert-octagon" size={18} color="#B91C1C" />
          <Text style={styles.reportBtnText}>Report Issue</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* TABS */}
      <View style={styles.inner}>
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
              {targetMeal ? (
                <>
                  <View style={styles.ticketHeader}>
                    <View>
                      <Text style={styles.ticketLabel}>UPCOMING MEAL</Text>
                      <Text style={styles.ticketMeal}>
                        {targetMeal.mealType}
                      </Text>
                      <Text
                        style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}
                      >
                        {new Date(targetMeal.servingTime).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          },
                        )}
                      </Text>
                    </View>
                    <View style={styles.liveBadge}>
                      <View style={styles.dot} />
                      <Text style={styles.liveText}>
                        {activeMealIndex !== -1 &&
                        new Date() >= new Date(targetMeal.servingTime)
                          ? "LIVE NOW"
                          : "UPCOMING"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.ticketBody}>
                    {isOptedIn ? (
                      <View style={styles.qrContainer}>
                        {qrToken ? (
                          <QRCode value={qrToken} size={160} />
                        ) : (
                          <ActivityIndicator color="#2563EB" />
                        )}
                        <Text style={styles.qrText}>Scan at Counter</Text>
                        {targetMeal.status === "SCANNED" && (
                          <View
                            style={{
                              marginTop: 10,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Feather
                              name="check-circle"
                              size={16}
                              color="#16A34A"
                            />
                            <Text
                              style={{
                                color: "#16A34A",
                                fontWeight: "700",
                                marginLeft: 4,
                              }}
                            >
                              Claimed
                            </Text>
                          </View>
                        )}
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
                    <Text style={styles.footerText}>
                      {isOptedIn ? "Enjoy your meal!" : "Will you be eating?"}
                    </Text>
                    {optingIn ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Switch
                        trackColor={{ false: "#767577", true: "#4ADE80" }}
                        thumbColor={isOptedIn ? "#ffffff" : "#f4f3f4"}
                        onValueChange={handleOptInToggle}
                        value={isOptedIn}
                      />
                    )}
                  </View>
                </>
              ) : (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: "#94A3B8" }}>
                    No upcoming meals found.
                  </Text>
                </View>
              )}
            </View>

            {/* Menu List */}
            <Text style={styles.sectionTitle}>Today's Menu</Text>

            {loadingMenu ? (
              <ActivityIndicator
                size="large"
                color="#B91C1C"
                style={{ marginTop: 20 }}
              />
            ) : menu.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="coffee" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  No menu available for today.
                </Text>
              </View>
            ) : (
              menu.map((meal, index) => {
                // Parse Serving Time
                const servingTime = new Date(meal.servingTime);
                const endTime = new Date(servingTime);
                endTime.setHours(servingTime.getHours() + 2); // Assuming 2 hours serving window

                const now = new Date();

                // Formatting
                const timeString = servingTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                const displayType =
                  meal.mealType.charAt(0) +
                  meal.mealType.slice(1).toLowerCase();

                // Logic for Status
                let status: "ONGOING" | "NEXT" | null = null;

                const isOngoing = now >= servingTime && now <= endTime;
                const isFuture = now < servingTime;

                // Check if previous meals are processed... map doesn't easily allow cross-item state
                // Better approach: Calculate "Active Index" outside the map?
                // Inside map:
                // If this meal is ongoing -> ONGOING
                // If this meal is future AND no previous meal was marked NEXT AND no previously processed meal was ONGOING?
                // Actually, simply:
                // Find the FIRST meal that has NOT ended (endTime > now).
                // If that meal's startTime <= now -> ONGOING
                // Else -> NEXT

                // But we are inside map.
                // We can check the menu array directly using index.

                // Find the index of the "current/next" meal
                const activeMealIndex = menu.findIndex((m) => {
                  const sTime = new Date(m.servingTime);
                  const eTime = new Date(sTime);
                  eTime.setHours(sTime.getHours() + 2);
                  return new Date() < eTime;
                });

                if (index === activeMealIndex) {
                  if (now >= servingTime) {
                    status = "ONGOING";
                  } else {
                    status = "NEXT";
                  }
                }

                return (
                  <View key={index} style={styles.menuCard}>
                    <View style={styles.menuHeader}>
                      <View style={styles.menuIconBox}>
                        <Feather
                          name={
                            meal.mealType === "BREAKFAST"
                              ? "sun"
                              : meal.mealType === "LUNCH"
                                ? "sun"
                                : "moon"
                          }
                          size={18}
                          color="white"
                        />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.menuType}>{displayType}</Text>
                        <Text style={styles.menuTime}>
                          Serves at {timeString}
                        </Text>
                      </View>

                      {status === "ONGOING" && (
                        <View
                          style={[
                            styles.activeTag,
                            { backgroundColor: "#DCFCE7" },
                          ]}
                        >
                          <Text
                            style={[styles.activeTagText, { color: "#16A34A" }]}
                          >
                            ONGOING
                          </Text>
                        </View>
                      )}

                      {status === "NEXT" && (
                        <View style={styles.activeTag}>
                          <Text style={styles.activeTagText}>NEXT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuItems}>{meal.items}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : (
          renderIssuesList()
        )}
      </View>
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

            {/* Image Picker Section */}
            <Text style={styles.label}>Attach Photos (optional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
            >
              {selectedImages.map((uri, idx) => (
                <View key={idx} style={styles.pickerThumbWrap}>
                  <Image source={{ uri }} style={styles.pickerThumb} />
                  <TouchableOpacity
                    style={styles.pickerRemoveBtn}
                    onPress={() => removeImage(idx)}
                  >
                    <Feather name="x" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 5 && (
                <TouchableOpacity
                  style={styles.pickerAddBtn}
                  onPress={pickImages}
                >
                  <Feather name="camera" size={22} color="#94A3B8" />
                  <Text style={styles.pickerAddText}>
                    {selectedImages.length === 0
                      ? "Add"
                      : `${selectedImages.length}/5`}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

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

      {/* Fullscreen Image Viewer */}
      {renderImageViewer()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // header: {
  //   paddingHorizontal: 24,
  //   paddingTop: 16,
  //   paddingBottom: 20,
  //   borderBottomLeftRadius: 24,
  //   borderBottomRightRadius: 24,
  //   marginBottom: 16,
  // },

  // Header
  header: {
    flexDirection: "row",
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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

  // Image Picker
  pickerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    paddingBottom: 4,
  },
  pickerThumbWrap: {
    position: "relative",
  },
  pickerThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  pickerRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerAddBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pickerAddText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
