import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// Gym Plans Data
const GYM_PLANS = [
  {
    id: "1",
    name: "Silver",
    tier: "SILVER",
    price: 300,
    duration: "MONTHLY",
    hasTrainer: false,
    accessHours: "6 AM - 8 PM",
    features: [
      "Access to cardio equipment",
      "Basic weights section",
      "6 AM - 8 PM access",
      "Locker facility",
    ],
    color: "#94A3B8",
    gradient: ["#94A3B8", "#64748B"],
  },
  {
    id: "2",
    name: "Gold",
    tier: "GOLD",
    price: 1500,
    duration: "QUARTERLY",
    hasTrainer: true,
    accessHours: "5 AM - 10 PM",
    features: [
      "Full gym access",
      "Personal trainer included",
      "5 AM - 10 PM access",
      "Nutrition consultation",
      "Premium locker",
      "Workout plan",
    ],
    color: "#F59E0B",
    gradient: ["#F59E0B", "#D97706"],
  },
];

// Mock current membership
const CURRENT_MEMBERSHIP = {
  hasMembership: true,
  plan: GYM_PLANS[0], // Gold plan
  startDate: "Jan 15, 2026",
  endDate: "Apr 15, 2026",
  status: "ACTIVE", // ACTIVE, EXPIRED, CANCELLED
  checkIns: 42,
  lastVisit: "Feb 12, 2026",
};

export default function GymScreen() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    (typeof GYM_PLANS)[0] | null
  >(null);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const renderMembershipCard = () => {
    if (!CURRENT_MEMBERSHIP.hasMembership) {
      return (
        <View style={styles.noMembershipCard}>
          <MaterialCommunityIcons name="dumbbell" size={50} color="#94A3B8" />
          <Text style={styles.noMembershipTitle}>No Active Membership</Text>
          <Text style={styles.noMembershipText}>
            Join our gym to start your fitness journey
          </Text>
          <TouchableOpacity
            style={styles.subscribeBtnLarge}
            onPress={() => setShowPlanModal(true)}
          >
            <Text style={styles.subscribeBtnText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const plan = CURRENT_MEMBERSHIP.plan;
    const isActive = CURRENT_MEMBERSHIP.status === "ACTIVE";

    return (
      <Pressable onPress={flipCard} style={styles.cardContainer}>
        {/* Front Side */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFace,
            frontAnimatedStyle,
            { backgroundColor: plan.gradient[0] },
          ]}
        >
          <View style={styles.cardPattern}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={120}
              color="rgba(255,255,255,0.1)"
              style={styles.patternIcon}
            />
          </View>

          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardLabel}>HABITAT FITNESS</Text>
              <Text style={styles.cardName}>Gaurav Daware</Text>
              <Text style={styles.cardId}>Member #2045</Text>
            </View>
            <View
              style={[
                styles.planBadge,
                {
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderColor: "rgba(255,255,255,0.5)",
                },
              ]}
            >
              <Text style={styles.planBadgeText}>{plan.tier}</Text>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>STATUS</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? "rgba(34, 197, 94, 0.9)"
                      : "rgba(239, 68, 68, 0.9)",
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {CURRENT_MEMBERSHIP.status}
                </Text>
              </View>
            </View>
            <View style={styles.tapHint}>
              <Feather
                name="refresh-cw"
                size={14}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.tapHintText}>Tap to flip</Text>
            </View>
          </View>
        </Animated.View>

        {/* Back Side */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFace,
            styles.cardBack,
            backAnimatedStyle,
            { backgroundColor: plan.gradient[1] },
          ]}
        >
          <View style={styles.cardBackHeader}>
            <MaterialCommunityIcons
              name="information"
              size={18}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.cardBackTitle}>MEMBERSHIP DETAILS</Text>
          </View>

          <View style={styles.cardBackContent}>
            <View style={styles.cardBackRow}>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>PLAN</Text>
                <Text style={styles.cardBackValue}>{plan.name}</Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>VALID TILL</Text>
                <Text style={styles.cardBackValue}>
                  {CURRENT_MEMBERSHIP.endDate}
                </Text>
              </View>
            </View>

            <View style={styles.cardBackRow}>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>CHECK-INS</Text>
                <Text style={styles.cardBackValue}>
                  {CURRENT_MEMBERSHIP.checkIns} visits
                </Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>LAST VISIT</Text>
                <Text style={styles.cardBackValue}>
                  {CURRENT_MEMBERSHIP.lastVisit}
                </Text>
              </View>
            </View>

            <View style={styles.cardBackRow}>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>ACCESS HOURS</Text>
                <Text style={styles.cardBackValue}>{plan.accessHours}</Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>TRAINER</Text>
                <Text
                  style={[
                    styles.cardBackValue,
                    { color: plan.hasTrainer ? "#22C55E" : "#EF4444" },
                  ]}
                >
                  {plan.hasTrainer ? "Included" : "Not Included"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tapHint}>
            <Feather
              name="refresh-cw"
              size={14}
              color="rgba(255,255,255,0.7)"
            />
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const renderPlanModal = () => (
    <Modal
      visible={showPlanModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPlanModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Your Plan</Text>
            <TouchableOpacity onPress={() => setShowPlanModal(false)}>
              <Feather name="x" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {GYM_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan(plan)}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planLeft}>
                    <MaterialCommunityIcons
                      name="dumbbell"
                      size={32}
                      color={plan.color}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <View
                        style={[
                          styles.planTierBadge,
                          {
                            backgroundColor: plan.color + "20",
                            borderColor: plan.color,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.planTierText, { color: plan.color }]}
                        >
                          {plan.tier}
                        </Text>
                      </View>
                      <Text style={styles.planName}>{plan.name}</Text>
                    </View>
                  </View>
                  <View style={styles.planPriceContainer}>
                    <Text style={styles.planPrice}>₹{plan.price}</Text>
                    <Text style={styles.planDuration}>/{plan.duration}</Text>
                  </View>
                </View>

                <View style={styles.planMeta}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={16}
                      color="#64748B"
                    />
                    <Text style={styles.metaText}>{plan.accessHours}</Text>
                  </View>
                  {plan.hasTrainer && (
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="account-tie"
                        size={16}
                        color="#22C55E"
                      />
                      <Text style={[styles.metaText, { color: "#22C55E" }]}>
                        Trainer Included
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.planFeatures}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Feather name="check" size={16} color="#22C55E" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.subscribeBtn,
              !selectedPlan && styles.subscribeBtnDisabled,
            ]}
            disabled={!selectedPlan}
            onPress={() => {
              // Handle subscription
              setShowPlanModal(false);
            }}
          >
            <Text style={styles.subscribeBtnText}>
              {CURRENT_MEMBERSHIP.hasMembership
                ? "Change Plan"
                : "Subscribe Now"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gym</Text>
        {CURRENT_MEMBERSHIP.hasMembership && (
          <TouchableOpacity
            style={styles.manageMembershipBtn}
            onPress={() => setShowPlanModal(true)}
          >
            <Feather name="settings" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Membership Card */}
        {renderMembershipCard()}

        {/* Membership Actions */}
        {CURRENT_MEMBERSHIP.hasMembership && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowPlanModal(true)}
            >
              <Feather name="refresh-cw" size={18} color="#F59E0B" />
              <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>
                Renew
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowPlanModal(true)}
            >
              <Feather name="arrow-up" size={18} color="#7C3AED" />
              <Text style={[styles.actionBtnText, { color: "#7C3AED" }]}>
                Upgrade
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Feather name="x-circle" size={18} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Gym Stats */}
        {CURRENT_MEMBERSHIP.hasMembership && (
          <>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={28}
                  color="#F59E0B"
                />
                <Text style={styles.statValue}>
                  {CURRENT_MEMBERSHIP.checkIns}
                </Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="fire" size={28} color="#EF4444" />
                <Text style={styles.statValue}>7</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={28}
                  color="#3B82F6"
                />
                <Text style={styles.statValue}>2.5h</Text>
                <Text style={styles.statLabel}>Avg. Duration</Text>
              </View>
            </View>

            {/* Facilities */}
            <Text style={styles.sectionTitle}>Facilities</Text>
            <View style={styles.facilitiesContainer}>
              <View style={styles.facilityCard}>
                <MaterialCommunityIcons name="run" size={32} color="#3B82F6" />
                <Text style={styles.facilityName}>Cardio Zone</Text>
                <Text style={styles.facilityDesc}>
                  Treadmills, cycles, ellipticals
                </Text>
              </View>
              <View style={styles.facilityCard}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={32}
                  color="#F59E0B"
                />
                <Text style={styles.facilityName}>Weights</Text>
                <Text style={styles.facilityDesc}>Free weights & machines</Text>
              </View>
              <View style={styles.facilityCard}>
                <MaterialCommunityIcons name="yoga" size={32} color="#7C3AED" />
                <Text style={styles.facilityName}>Yoga Studio</Text>
                <Text style={styles.facilityDesc}>Meditation & stretching</Text>
              </View>
              <View style={styles.facilityCard}>
                <MaterialCommunityIcons
                  name="locker"
                  size={32}
                  color="#64748B"
                />
                <Text style={styles.facilityName}>Lockers</Text>
                <Text style={styles.facilityDesc}>Secure storage</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {renderPlanModal()}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  manageMembershipBtn: {
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 12,
  },

  // No Membership Card
  noMembershipCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  noMembershipTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 16,
  },
  noMembershipText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  subscribeBtnLarge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },

  // Card
  cardContainer: { marginBottom: 24, height: 200 },
  card: {
    borderRadius: 20,
    padding: 20,
    height: 200,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  cardPattern: {
    position: "absolute",
    right: -20,
    top: -20,
  },
  patternIcon: {
    transform: [{ rotate: "25deg" }],
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 1,
  },
  cardLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardName: { fontSize: 20, color: "white", fontWeight: "bold" },
  cardId: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "white",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    zIndex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusText: { color: "white", fontSize: 10, fontWeight: "800" },

  // Flip Card Styles
  cardFace: {
    backfaceVisibility: "hidden",
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  cardBackHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardBackTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 8,
  },
  cardBackContent: {
    flex: 1,
  },
  cardBackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardBackItem: {
    flex: 1,
  },
  cardBackLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardBackValue: {
    fontSize: 16,
    color: "white",
    fontWeight: "700",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  tapHintText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 4,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Stats
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // Facilities
  facilitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  facilityCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  facilityName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  facilityDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  planCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  planCardSelected: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  planTierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  planTierText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  planPriceContainer: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  planDuration: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  planMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#475569",
  },
  subscribeBtn: {
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  subscribeBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  subscribeBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
