import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Animated,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

// Dummy Data
const MEMBERSHIP_PLANS = [
  {
    id: "1",
    name: "Basic Access",
    tier: "BRONZE",
    price: 0,
    duration: "MONTHLY",
    maxBooks: 2,
    finePerDay: 5,
    features: ["2 books at a time", "₹5/day late fine", "Physical books only"],
    color: "#CD7F32",
  },
  {
    id: "2",
    name: "Scholar Pack",
    tier: "SILVER",
    price: 500,
    duration: "HALF_YEARLY",
    maxBooks: 5,
    finePerDay: 2,
    features: [
      "5 books at a time",
      "₹2/day late fine",
      "Digital library access",
      "Priority borrowing",
    ],
    color: "#C0C0C0",
  },
  {
    id: "3",
    name: "Premium",
    tier: "GOLD",
    price: 1500,
    duration: "YEARLY",
    maxBooks: 10,
    finePerDay: 0,
    features: [
      "10 books at a time",
      "No late fines",
      "Digital library access",
      "Priority borrowing",
      "Extended loan period",
    ],
    color: "#FFD700",
  },
];

const BORROWED_BOOKS = [
  {
    id: "1",
    title: "Clean Architecture",
    author: "Robert Martin",
    dueDate: "2026-02-20",
    borrowDate: "2026-02-06",
    isOverdue: false,
  },
  {
    id: "2",
    title: "Intro to Algorithms",
    author: "Cormen",
    dueDate: "2026-02-10",
    borrowDate: "2026-01-27",
    isOverdue: true,
  },
];

const DIGITAL_BOOKS = [
  {
    id: "d1",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt",
    format: "EBOOK",
    size: "2.4 MB",
  },
  {
    id: "d2",
    title: "You Don't Know JS",
    author: "Kyle Simpson",
    format: "EBOOK",
    size: "1.8 MB",
  },
];

const HISTORY_BOOKS = [
  {
    id: "3",
    title: "React Native in Action",
    author: "Dabit",
    returnDate: "Jan 20, 2026",
  },
  {
    id: "4",
    title: "The Pragmatic Programmer",
    author: "Andy Hunt",
    returnDate: "Dec 15, 2025",
  },
];

// Mock current membership status
const CURRENT_MEMBERSHIP = {
  hasMembership: true,
  plan: MEMBERSHIP_PLANS[1], // Silver plan
  startDate: "Aug 15, 2022",
  endDate: "Feb 15, 2026",
  status: "ACTIVE", // ACTIVE, EXPIRED, CANCELLED
  totalBorrowed: 24,
  currentBorrowed: 2,
  fineBalance: 0,
};

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState("borrowed");
  const [showDigitalLibrary, setShowDigitalLibrary] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
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

  const borrowedBooks = BORROWED_BOOKS.filter((b) => !b.isOverdue);
  const overdueBooks = BORROWED_BOOKS.filter((b) => b.isOverdue);

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderMembershipCard = () => {
    if (!CURRENT_MEMBERSHIP.hasMembership) {
      return (
        <View style={styles.noMembershipCard}>
          <Feather name="book-open" size={40} color="#94A3B8" />
          <Text style={styles.noMembershipTitle}>No Active Membership</Text>
          <Text style={styles.noMembershipText}>
            Subscribe to a plan to start borrowing books
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
          style={[styles.card, styles.cardFace, frontAnimatedStyle]}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardLabel}>HABITAT LIBRARY</Text>
              <Text style={styles.cardName}>Gaurav Daware</Text>
              <Text style={styles.cardId}>ID: 2022-CS-045</Text>
            </View>
            <View
              style={[
                styles.planBadge,
                { backgroundColor: plan.color + "30", borderColor: plan.color },
              ]}
            >
              <Text style={[styles.planBadgeText, { color: plan.color }]}>
                {plan.tier}
              </Text>
            </View>
          </View>
          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>MEMBERSHIP STATUS</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive ? "#22C55E" : "#EF4444",
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
                color="rgba(255,255,255,0.5)"
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
          ]}
        >
          <View style={styles.cardBackHeader}>
            <Feather name="info" size={18} color="#94A3B8" />
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
                <Text style={styles.cardBackLabel}>BOOKS BORROWED</Text>
                <Text style={styles.cardBackValue}>
                  {CURRENT_MEMBERSHIP.totalBorrowed} total
                </Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>CURRENT</Text>
                <Text style={styles.cardBackValue}>
                  {CURRENT_MEMBERSHIP.currentBorrowed}/{plan.maxBooks}
                </Text>
              </View>
            </View>

            <View style={styles.cardBackRow}>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>FINE BALANCE</Text>
                <Text
                  style={[
                    styles.cardBackValue,
                    {
                      color:
                        CURRENT_MEMBERSHIP.fineBalance > 0
                          ? "#EF4444"
                          : "#22C55E",
                    },
                  ]}
                >
                  ₹{CURRENT_MEMBERSHIP.fineBalance}
                </Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>FINE/DAY</Text>
                <Text style={styles.cardBackValue}>₹{plan.finePerDay}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tapHint}>
            <Feather
              name="refresh-cw"
              size={14}
              color="rgba(255,255,255,0.5)"
            />
            <Text style={styles.tapHintText}>Tap to flip back</Text>
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
            {MEMBERSHIP_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan(plan)}
              >
                <View style={styles.planHeader}>
                  <View>
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
                  <View style={styles.planPriceContainer}>
                    <Text style={styles.planPrice}>₹{plan.price}</Text>
                    <Text style={styles.planDuration}>/{plan.duration}</Text>
                  </View>
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
        <Text style={styles.headerTitle}>Library</Text>
        <View style={styles.headerActions}>
          {CURRENT_MEMBERSHIP.hasMembership &&
            CURRENT_MEMBERSHIP.plan.tier !== "BRONZE" && (
              <TouchableOpacity
                style={styles.digitalLibraryBtn}
                onPress={() => setShowDigitalLibrary(true)}
              >
                <Feather name="download-cloud" size={20} color="#7C3AED" />
                <Text style={styles.digitalLibraryBtnText}>Digital</Text>
              </TouchableOpacity>
            )}
          {CURRENT_MEMBERSHIP.hasMembership && (
            <TouchableOpacity
              style={styles.manageMembershipBtn}
              onPress={() => setShowPlanModal(true)}
            >
              <Feather name="settings" size={20} color="#2563EB" />
            </TouchableOpacity>
          )}
        </View>
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
              <Feather name="refresh-cw" size={18} color="#2563EB" />
              <Text style={styles.actionBtnText}>Renew</Text>
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

        {/* Search Bar */}
        {CURRENT_MEMBERSHIP.hasMembership && (
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search for books..."
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* Tabs */}
        {CURRENT_MEMBERSHIP.hasMembership && (
          <>
            <View style={styles.tabs}>
              <TouchableOpacity
                onPress={() => setActiveTab("borrowed")}
                style={styles.tabItem}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "borrowed" && styles.tabTextActive,
                  ]}
                >
                  Borrowed ({borrowedBooks.length})
                </Text>
                {activeTab === "borrowed" && <View style={styles.activeLine} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("overdue")}
                style={styles.tabItem}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "overdue" && styles.tabTextActive,
                  ]}
                >
                  Overdue ({overdueBooks.length})
                </Text>
                {activeTab === "overdue" && <View style={styles.activeLine} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("history")}
                style={styles.tabItem}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "history" && styles.tabTextActive,
                  ]}
                >
                  History
                </Text>
                {activeTab === "history" && <View style={styles.activeLine} />}
              </TouchableOpacity>
            </View>

            {/* Book Lists */}
            <View style={styles.listContainer}>
              {activeTab === "borrowed" &&
                borrowedBooks.map((book) => {
                  const daysLeft = getDaysUntilDue(book.dueDate);
                  return (
                    <View key={book.id} style={styles.bookItem}>
                      <View style={styles.bookCover}>
                        <Feather name="book" size={24} color="#CBD5E1" />
                      </View>
                      <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={styles.bookAuthor}>{book.author}</Text>
                        <Text
                          style={[
                            styles.bookDue,
                            { color: daysLeft <= 3 ? "#F59E0B" : "#64748B" },
                          ]}
                        >
                          Due in {daysLeft} days
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.renewBtn}>
                        <Text style={styles.renewText}>Renew</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

              {activeTab === "overdue" &&
                overdueBooks.map((book) => {
                  const daysOverdue = Math.abs(getDaysUntilDue(book.dueDate));
                  const fine = daysOverdue * CURRENT_MEMBERSHIP.plan.finePerDay;
                  return (
                    <View key={book.id} style={styles.bookItem}>
                      <View
                        style={[
                          styles.bookCover,
                          { backgroundColor: "#FEE2E2" },
                        ]}
                      >
                        <Feather
                          name="alert-circle"
                          size={24}
                          color="#DC2626"
                        />
                      </View>
                      <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={styles.bookAuthor}>{book.author}</Text>
                        <Text style={styles.overdueText}>
                          {daysOverdue} days overdue
                        </Text>
                        {fine > 0 && (
                          <Text style={styles.fineText}>Fine: ₹{fine}</Text>
                        )}
                      </View>
                      <TouchableOpacity style={styles.returnBtn}>
                        <Text style={styles.returnText}>Return</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

              {activeTab === "history" &&
                HISTORY_BOOKS.map((book) => (
                  <View
                    key={book.id}
                    style={[styles.bookItem, { opacity: 0.7 }]}
                  >
                    <View
                      style={[styles.bookCover, { backgroundColor: "#E2E8F0" }]}
                    >
                      <Feather name="check" size={24} color="#64748B" />
                    </View>
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      <Text style={styles.bookAuthor}>{book.author}</Text>
                      <Text style={styles.bookReturned}>
                        Returned: {book.returnDate}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>

      {renderPlanModal()}

      {/* Digital Library Modal */}
      <Modal
        visible={showDigitalLibrary}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDigitalLibrary(false)}
      >
        <SafeAreaView style={styles.digitalLibraryContainer}>
          <View style={styles.digitalLibraryHeader}>
            <TouchableOpacity onPress={() => setShowDigitalLibrary(false)}>
              <Feather name="arrow-left" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.digitalLibraryTitle}>Digital Library</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.digitalLibrarySearch}>
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search digital books..."
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <ScrollView style={styles.digitalLibraryContent}>
            <Text style={styles.sectionTitle}>Available E-Books</Text>
            {DIGITAL_BOOKS.map((book) => (
              <View key={book.id} style={styles.digitalBookCard}>
                <View style={styles.digitalBookIcon}>
                  <Feather name="file-text" size={32} color="#7C3AED" />
                </View>
                <View style={styles.digitalBookInfo}>
                  <Text style={styles.digitalBookTitle}>{book.title}</Text>
                  <Text style={styles.digitalBookAuthor}>{book.author}</Text>
                  <View style={styles.digitalBookMeta}>
                    <View style={styles.formatBadge}>
                      <Text style={styles.formatText}>{book.format}</Text>
                    </View>
                    <Text style={styles.digitalBookSize}>{book.size}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.digitalDownloadBtn}>
                  <Feather name="download" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  manageMembershipBtn: {
    backgroundColor: "#DBEAFE",
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
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },

  // Card
  cardContainer: { marginBottom: 24 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    minHeight: 180,
    justifyContent: "space-between",
    shadowColor: "#1E293B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardName: { fontSize: 20, color: "white", fontWeight: "bold" },
  cardId: { fontSize: 14, color: "#CBD5E1", marginTop: 2 },
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
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
    color: "#94A3B8",
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
    color: "#94A3B8",
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
    color: "rgba(255,255,255,0.5)",
    marginLeft: 4,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
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
    color: "#2563EB",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 16, color: "#0F172A" },

  // Tabs
  tabs: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabItem: { marginRight: 24, paddingBottom: 10 },
  tabText: { fontSize: 16, color: "#64748B", fontWeight: "600" },
  tabTextActive: { color: "#2563EB", fontWeight: "700" },
  activeLine: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#2563EB",
  },

  // List
  listContainer: { paddingBottom: 40 },
  bookItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bookCover: {
    width: 50,
    height: 70,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  bookAuthor: { fontSize: 14, color: "#64748B" },
  bookDue: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  overdueText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 4,
  },
  fineText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "700",
    marginTop: 2,
  },
  bookFormat: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
    marginTop: 4,
  },
  bookReturned: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },
  renewBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  renewText: { color: "#2563EB", fontSize: 12, fontWeight: "600" },
  returnBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  returnText: { color: "#DC2626", fontSize: 12, fontWeight: "600" },
  downloadBtn: {
    backgroundColor: "#DBEAFE",
    padding: 10,
    borderRadius: 8,
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
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
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
    backgroundColor: "#2563EB",
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

  // Digital Library Button
  digitalLibraryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginRight: 12,
  },
  digitalLibraryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C3AED",
  },

  // Digital Library Modal
  digitalLibraryContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  digitalLibraryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  digitalLibraryTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  digitalLibrarySearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  digitalLibraryContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  digitalBookCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  digitalBookIcon: {
    width: 60,
    height: 80,
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  digitalBookInfo: {
    flex: 1,
  },
  digitalBookTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  digitalBookAuthor: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  digitalBookMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formatBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  digitalBookSize: {
    fontSize: 12,
    color: "#94A3B8",
  },
  digitalDownloadBtn: {
    backgroundColor: "#7C3AED",
    padding: 12,
    borderRadius: 12,
  },
});
