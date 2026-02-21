import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import {
  orchestratorService,
  Resource,
  TimeSlot,
  Booking,
  WaitlistEntry,
} from "../../src/services/orchestrator.service";

const { width } = Dimensions.get("window");

// ─── Component ─────────────────────────────────────────
export default function LaundryScreen() {
  const [machines, setMachines] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Slot picker
  const [selectedMachine, setSelectedMachine] = useState<Resource | null>(null);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [booking, setBooking] = useState(false);

  // My queue
  const [myBooking, setMyBooking] = useState<Booking | null>(null);
  const [myBookingMachine, setMyBookingMachine] = useState<Resource | null>(
    null,
  );
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(
    null,
  );

  // ─── Data Fetching ───────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [resourcesData, queueData] = await Promise.all([
        orchestratorService.getResources(),
        orchestratorService.getMyQueue(),
      ]);

      setMachines(resourcesData);

      // Find active laundry booking
      const activeBooking = queueData.bookings.find(
        (b) => b.status === "CONFIRMED" || b.status === "ACTIVE",
      );
      setMyBooking(activeBooking || null);

      // Find the machine name for the active booking
      if (activeBooking) {
        const machine = resourcesData.find(
          (r) => r.id === activeBooking.resourceId,
        );
        setMyBookingMachine(machine || null);
      } else {
        setMyBookingMachine(null);
      }

      // Check if on laundry waitlist
      const laundryWaitlist = queueData.waitlists.find(
        (w) => w.type === "LAUNDRY" && w.status === "WAITING",
      );
      setOnWaitlist(!!laundryWaitlist);
      setWaitlistEntry(laundryWaitlist || null);
    } catch (error) {
      console.error("Failed to fetch laundry data:", error);
      Alert.alert("Error", "Failed to load laundry data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ─── Slot Fetching ───────────────────────────────────
  const fetchSlots = async (resourceId: string) => {
    try {
      setLoadingSlots(true);
      const slots = await orchestratorService.getAvailableSlots(resourceId);
      setTimeSlots(slots);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
      Alert.alert("Error", "Failed to load available slots.");
    } finally {
      setLoadingSlots(false);
    }
  };

  // ─── Machine Counts ──────────────────────────────────
  const availableCount = machines.filter(
    (m) => m.liveStatus === "AVAILABLE",
  ).length;
  const inUseCount = machines.filter((m) => m.liveStatus === "IN_USE").length;
  const fullyBookedCount = machines.filter(
    (m) => m.liveStatus === "FULLY_BOOKED",
  ).length;
  const maintenanceCount = machines.filter(
    (m) => m.liveStatus === "MAINTENANCE",
  ).length;

  const totalSlotsAvailable = machines.reduce(
    (acc, m) => acc + (m.slotsLeft || 0),
    0,
  );

  console.log("Total Slots Available:", totalSlotsAvailable);

  // ─── Helpers to extract machine number from name ─────
  const getMachineNumber = (machine: Resource): number => {
    const match = machine.name.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // ─── Handlers ────────────────────────────────────────
  const handleMachinePress = (machine: Resource) => {
    if (machine.liveStatus === "MAINTENANCE") {
      Alert.alert(
        "Under Maintenance",
        `${machine.name} is currently under maintenance.`,
      );
      return;
    }
    if (machine.liveStatus === "IN_USE") {
      const mins = machine.availableAt
        ? Math.max(
            0,
            Math.round(
              (new Date(machine.availableAt).getTime() - Date.now()) / 60000,
            ),
          )
        : 0;
      Alert.alert(
        "Machine In Use",
        `${machine.name} is being used by ${machine.currentUser}.\nAvailable in ~${mins} min. \n\nCheck for a different slot!`,
      );
      // Let them still see slots for later
      setSelectedMachine(machine);
      setSelectedSlot(null);
      setSlotModalVisible(true);
      fetchSlots(machine.id);
      return;
    }
    if (machine.liveStatus === "FULLY_BOOKED") {
      Alert.alert(
        "Fully Booked",
        `${machine.name} has no available slots left for today.`,
      );
      return;
    }
    // if (myBooking) {
    //   Alert.alert(
    //     "Already Booked",
    //     "You already have an active booking. Cancel it first to book another.",
    //   );
    //   return;
    // }
    setSelectedMachine(machine);
    setSelectedSlot(null);
    setSlotModalVisible(true);
    fetchSlots(machine.id);
  };

  const handleConfirmBooking = async () => {
    if (!selectedMachine || !selectedSlot) return;

    try {
      setBooking(true);
      await orchestratorService.bookSlot(
        selectedMachine.id,
        selectedSlot.startTime,
        selectedSlot.endTime,
      );

      setSlotModalVisible(false);

      const fmt = (iso: string) =>
        new Date(iso).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

      Alert.alert(
        "Booking Confirmed! 🎉",
        `${selectedMachine.name} booked for ${fmt(selectedSlot.startTime)} – ${fmt(selectedSlot.endTime)}`,
      );

      // Refresh data
      fetchData();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSlotModalVisible(false);
        Alert.alert(
          "Slot Taken!",
          err.response.data?.message ||
            "This slot was just taken. Want to join the waitlist?",
          [
            { text: "No Thanks", style: "cancel" },
            { text: "Join Waitlist", onPress: () => handleJoinWaitlist() },
          ],
        );
      } else {
        Alert.alert(
          "Error",
          err.response?.data?.message || "Failed to book slot.",
        );
      }
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = () => {
    if (!myBooking) return;
    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel your laundry booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await orchestratorService.cancelBooking(myBooking.id);
              Alert.alert("Cancelled", "Your booking has been cancelled.");
              fetchData();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to cancel booking.",
              );
            }
          },
        },
      ],
    );
  };

  const handleJoinWaitlist = async () => {
    try {
      await orchestratorService.joinWaitlist("LAUNDRY");
      Alert.alert(
        "Joined! 🎰",
        "You're on the waitlist. We'll notify you when a machine opens up.",
      );
      fetchData();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to join waitlist.",
      );
    }
  };

  const handleLeaveWaitlist = () => {
    // Backend doesn't have a leave waitlist endpoint - show info
    Alert.alert(
      "Info",
      "To leave the waitlist, please contact the hostel admin.",
    );
  };

  // ─── Machine Icon Color ──────────────────────────────
  const getMachineColors = (status: Resource["liveStatus"]) => {
    switch (status) {
      case "AVAILABLE":
        return {
          bg: "#DCFCE7",
          border: "#86EFAC",
          text: "#15803D",
          icon: "#22C55E",
        };
      case "IN_USE":
        return {
          bg: "#FEF9C3",
          border: "#FDE047",
          text: "#A16207",
          icon: "#EAB308",
        };
      case "FULLY_BOOKED":
        return {
          bg: "#FFEDD5",
          border: "#FDBA74",
          text: "#C2410C",
          icon: "#F97316",
        };
      case "MAINTENANCE":
        return {
          bg: "#FEE2E2",
          border: "#FCA5A5",
          text: "#B91C1C",
          icon: "#EF4444",
        };
    }
  };

  const getMachineIcon = (status: Resource["liveStatus"]) => {
    switch (status) {
      case "AVAILABLE":
        return "check-circle";
      case "IN_USE":
        return "clock";
      case "FULLY_BOOKED":
        return "slash";
      case "MAINTENANCE":
        return "tool";
    }
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  // ─── Loading State ───────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#2563EB" />
        <Text
          style={{ color: "#64748B", marginTop: 12, fontFamily: "SNProMedium" }}
        >
          Loading machines...
        </Text>
      </SafeAreaView>
    );
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Laundry Room</Text>
          <Text style={styles.headerSub}>
            {availableCount} machine{availableCount !== 1 ? "s" : ""} available
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Feather name="droplet" size={20} color="#2563EB" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Active Booking Card ──────────────────── */}
        {myBooking && myBookingMachine && (
          <View style={styles.bookingCard}>
            {/* Header: Status and Cancel */}
            <View style={styles.bookingHeader}>
              <View
                style={[
                  styles.bookingBadge,
                  myBooking.status === "ACTIVE"
                    ? styles.badgeActive
                    : styles.badgeUpcoming,
                ]}
              >
                <View
                  style={[
                    styles.bookingDot,
                    myBooking.status === "ACTIVE"
                      ? styles.dotActive
                      : styles.dotUpcoming,
                  ]}
                />
                <Text
                  style={[
                    styles.bookingBadgeText,
                    myBooking.status === "ACTIVE"
                      ? styles.badgeTextActive
                      : styles.badgeTextUpcoming,
                  ]}
                >
                  {myBooking.status === "ACTIVE" ? "IN PROGRESS" : "UPCOMING"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCancelBooking}
                style={styles.cancelBtn}
              >
                <Feather name="x" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Body: Machine Details */}
            <View style={styles.bookingBody}>
              <View style={styles.bookingMachineCircle}>
                <Text style={styles.bookingMachineNum}>
                  {getMachineNumber(myBookingMachine)}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.bookingMachineName}>
                  {myBookingMachine.name}
                </Text>
                <Text style={styles.bookingTime}>
                  {fmtTime(myBooking.startTime)} – {fmtTime(myBooking.endTime)}
                </Text>
              </View>
            </View>

            {/* Footer: View QR */}
            <View style={styles.bookingFooter}>
              <TouchableOpacity
                style={styles.qrBtn}
                onPress={() =>
                  Alert.alert("View QR", "Open QR Code modal here")
                }
              >
                <Feather name="maximize" size={16} color="#0F172A" />
                <Text style={styles.qrBtnText}>View QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Waitlist Card ──────────────────────── */}
        {onWaitlist && !myBooking && (
          <View style={styles.waitlistCard}>
            <View style={styles.waitlistLeft}>
              <View style={styles.waitlistIcon}>
                <Feather name="users" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.waitlistTitle}>On Waitlist</Text>
                <Text style={styles.waitlistSub}>
                  You'll be notified when a machine is free
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleLeaveWaitlist}
              style={styles.waitlistLeaveBtn}
            >
              <Text style={styles.waitlistLeaveText}>Info</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Machine Grid Section ───────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Machines</Text>
            <View style={styles.statusSummary}>
              <View
                style={[styles.statusDot, { backgroundColor: "#22C55E" }]}
              />
              <Text style={styles.statusCount}>{availableCount}</Text>

              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: "#EAB308", marginLeft: 10 },
                ]}
              />
              <Text style={styles.statusCount}>{inUseCount}</Text>

              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: "#F97316", marginLeft: 10 },
                ]}
              />
              <Text style={styles.statusCount}>{fullyBookedCount}</Text>

              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: "#EF4444", marginLeft: 10 },
                ]}
              />
              <Text style={styles.statusCount}>{maintenanceCount}</Text>
            </View>
          </View>

          {machines.length === 0 ? (
            <View style={{ alignItems: "center", padding: 30 }}>
              <Feather name="inbox" size={40} color="#CBD5E1" />
              <Text
                style={{
                  color: "#94A3B8",
                  marginTop: 10,
                  fontFamily: "SNProMedium",
                }}
              >
                No machines found
              </Text>
            </View>
          ) : (
            <>
              {/* Machine Grid */}
              <View style={styles.machineGrid}>
                {machines.map((machine) => {
                  const colors = getMachineColors(machine.liveStatus);
                  const icon = getMachineIcon(machine.liveStatus);
                  const number = getMachineNumber(machine);
                  return (
                    <TouchableOpacity
                      key={machine.id}
                      style={[
                        styles.machineItem,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleMachinePress(machine)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.machineNumber, { color: colors.text }]}
                      >
                        {number}
                      </Text>
                      <Feather
                        name={icon as any}
                        size={14}
                        color={colors.icon}
                        style={{ marginTop: 2 }}
                      />
                      {machine.liveStatus === "IN_USE" &&
                        machine.availableAt && (
                          <Text
                            style={[
                              styles.machineTimer,
                              { color: colors.text },
                            ]}
                          >
                            {Math.max(
                              0,
                              Math.round(
                                (new Date(machine.availableAt).getTime() -
                                  Date.now()) /
                                  60000,
                              ),
                            )}
                            m
                          </Text>
                        )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#22C55E" }]}
                  />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#EAB308" }]}
                  />
                  <Text style={styles.legendText}>In Use</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#EF4444" }]}
                  />
                  <Text style={styles.legendText}>Maintenance</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Join Waitlist CTA ──────────────────── */}
        {totalSlotsAvailable === 0 && !onWaitlist && machines.length > 0 && (
          <TouchableOpacity
            style={styles.waitlistCta}
            onPress={handleJoinWaitlist}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7C3AED", "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.waitlistCtaGradient}
            >
              <Feather name="bell" size={20} color="white" />
              <Text style={styles.waitlistCtaText}>Join Waitlist</Text>
              <Text style={styles.waitlistCtaSub}>
                Get notified when a machine opens up
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── How It Works ──────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {[
              {
                icon: "target",
                text: "Select an available machine",
                color: "#22C55E",
              },
              {
                icon: "clock",
                text: "Pick your 45-min time slot",
                color: "#2563EB",
              },
              {
                icon: "check",
                text: "Collect clothes when done",
                color: "#7C3AED",
              },
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIcon,
                    { backgroundColor: `${step.color}15` },
                  ]}
                >
                  <Feather
                    name={step.icon as any}
                    size={16}
                    color={step.color}
                  />
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
                {i < 2 && <View style={styles.stepLine} />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Slot Picker Modal ────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={slotModalVisible}
        onRequestClose={() => setSlotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Book {selectedMachine?.name}
                </Text>
                <Text style={styles.modalSub}>
                  Select a 45-minute time slot
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSlotModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Selected Machine Preview */}
            <View style={styles.machinePreview}>
              <View style={styles.previewCircle}>
                <Text style={styles.previewNumber}>
                  {selectedMachine ? getMachineNumber(selectedMachine) : ""}
                </Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.previewName}>{selectedMachine?.name}</Text>
                <Text style={styles.previewStatus}>Ready to use</Text>
              </View>
            </View>

            {/* Slot List */}
            {loadingSlots ? (
              <ActivityIndicator
                size="large"
                color="#2563EB"
                style={{ marginVertical: 40 }}
              />
            ) : timeSlots.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Feather name="calendar" size={36} color="#CBD5E1" />
                <Text
                  style={{
                    color: "#94A3B8",
                    marginTop: 10,
                    fontFamily: "SNProMedium",
                  }}
                >
                  No slots available today
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 280 }}
                showsVerticalScrollIndicator={false}
              >
                {timeSlots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotItem,
                        isSelected && styles.slotItemSelected,
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={isSelected ? "check-circle" : "circle"}
                        size={20}
                        color={isSelected ? "#2563EB" : "#CBD5E1"}
                      />
                      <Text
                        style={[
                          styles.slotLabel,
                          isSelected && styles.slotLabelSelected,
                        ]}
                      >
                        {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!selectedSlot || booking) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmBooking}
              disabled={!selectedSlot || booking}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  selectedSlot && !booking
                    ? ["#2563EB", "#1D4ED8"]
                    : ["#94A3B8", "#94A3B8"]
                }
                style={styles.confirmBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {booking ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="white" />
                    <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────
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
  headerTitle: {
    fontSize: 26,
    fontFamily: "SNProBold",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "SNProMedium",
    color: "#64748B",
    marginTop: 2,
  },
  headerBadge: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Active Booking Card
  bookingCard: {
    backgroundColor: "white",
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: "#DCFCE7",
  },
  badgeUpcoming: {
    backgroundColor: "#EFF6FF",
  },
  bookingDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: "#22C55E",
  },
  dotUpcoming: {
    backgroundColor: "#3B82F6",
  },
  bookingBadgeText: {
    fontSize: 12,
    fontFamily: "SNProBold",
    letterSpacing: 0.5,
  },
  badgeTextActive: {
    color: "#15803D",
  },
  badgeTextUpcoming: {
    color: "#1D4ED8",
  },
  cancelBtn: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingBody: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  bookingMachineCircle: {
    height: 52,
    width: 52,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingMachineNum: {
    fontSize: 22,
    fontFamily: "SNProBold",
    color: "#0F172A",
  },
  bookingMachineName: {
    fontSize: 18,
    fontFamily: "SNProBold",
    color: "#0F172A",
  },
  bookingTime: {
    fontSize: 14,
    fontFamily: "SNProMedium",
    color: "#64748B",
    marginTop: 2,
  },
  bookingFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  qrBtnText: {
    fontSize: 15,
    fontFamily: "SNProBold",
    color: "#0F172A",
  },

  // Waitlist Card
  waitlistCard: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  waitlistLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  waitlistIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  waitlistTitle: {
    fontSize: 15,
    fontFamily: "SNProBold",
    color: "#5B21B6",
  },
  waitlistSub: {
    fontSize: 12,
    fontFamily: "SNProMedium",
    color: "#7C3AED",
    marginTop: 1,
  },
  waitlistLeaveBtn: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  waitlistLeaveText: {
    fontSize: 13,
    fontFamily: "SNProBold",
    color: "#7C3AED",
  },

  // Section Card
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "SNProBold",
    color: "#0F172A",
  },
  statusSummary: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  statusCount: {
    fontSize: 13,
    fontFamily: "SNProBold",
    color: "#64748B",
    marginLeft: 4,
  },

  // Machine Grid
  machineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  machineItem: {
    width: (width - 40 - 60 - 36) / 4,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    minHeight: 64,
  },
  machineNumber: {
    fontSize: 20,
    fontFamily: "SNProBold",
  },
  machineTimer: {
    fontSize: 10,
    fontFamily: "SNProBold",
    marginTop: 1,
  },

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontFamily: "SNProMedium",
    color: "#64748B",
  },

  // Waitlist CTA
  waitlistCta: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  waitlistCtaGradient: {
    padding: 22,
    borderRadius: 20,
    alignItems: "center",
  },
  waitlistCtaText: {
    fontSize: 18,
    fontFamily: "SNProBold",
    color: "white",
    marginTop: 8,
  },
  waitlistCtaSub: {
    fontSize: 13,
    fontFamily: "SNProMedium",
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },

  // How It Works Steps
  stepsContainer: {
    marginTop: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  stepIcon: {
    height: 36,
    width: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    fontFamily: "SNProMedium",
    color: "#334155",
    marginLeft: 14,
    flex: 1,
  },
  stepLine: {
    position: "absolute",
    left: 17,
    top: 38,
    width: 2,
    height: 16,
    backgroundColor: "#E2E8F0",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "SNProBold",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 14,
    fontFamily: "SNProMedium",
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Machine Preview
  machinePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  previewCircle: {
    height: 44,
    width: 44,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  previewNumber: {
    fontSize: 20,
    fontFamily: "SNProBold",
    color: "white",
  },
  previewName: {
    fontSize: 16,
    fontFamily: "SNProBold",
    color: "#15803D",
  },
  previewStatus: {
    fontSize: 12,
    fontFamily: "SNProMedium",
    color: "#22C55E",
  },

  // Slot Items
  slotItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  slotItemSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  slotLabel: {
    fontSize: 15,
    fontFamily: "SNProMedium",
    color: "#334155",
    marginLeft: 12,
  },
  slotLabelSelected: {
    color: "#2563EB",
    fontFamily: "SNProBold",
  },

  // Confirm Button
  confirmBtn: {
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: "SNProBold",
    color: "white",
  },
});
