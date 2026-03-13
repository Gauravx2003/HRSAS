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
import { BlurView } from "expo-blur";
import { DigitalLibraryModal } from "../../components/library/DigitalLibraryModal";
import { ExploreLibraryModal } from "../../components/library/ExploreLibraryModal";
import { ReservationQRModal } from "../../components/library/ReservationQRModal";
import {
  membershipService,
  Membership,
  Plan,
} from "../../src/services/membership.service";
import {
  libraryService,
  LibraryTransaction,
  LibraryBook,
  LibraryReservation,
} from "../../src/services/library.service";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store/store";

// Dummy Data
const getPlanDisplayInfo = (plan: Plan) => {
  const name = plan.name.toLowerCase();
  if (name.includes("basic") || name.includes("bronze")) {
    return {
      tier: "BRONZE",
      color: "#CD7F32",
      features: [
        `${plan.maxBooksAllowed || 2} books at a time`,
        `₹${plan.finePerDay || 5}/day late fine`,
        "Physical books only",
      ],
    };
  } else if (name.includes("silver") || name.includes("scholar")) {
    return {
      tier: "SILVER",
      color: "#C0C0C0",
      features: [
        `${plan.maxBooksAllowed || 5} books at a time`,
        `₹${plan.finePerDay || 2}/day late fine`,
        "Digital library access",
        "Priority borrowing",
      ],
    };
  } else {
    return {
      tier: "GOLD",
      color: "#FFD700",
      features: [
        `${plan.maxBooksAllowed || 10} books at a time`,
        plan.finePerDay === 0
          ? "No late fines"
          : `₹${plan.finePerDay}/day fine`,
        "Digital library access",
        "Priority borrowing",
        "Extended loan period",
      ],
    };
  }
};

// MEMBERSHIP_PLANS removed

// BORROWED_BOOKS removed

// DIGITAL_BOOKS removed

// HISTORY_BOOKS removed

// Mock current membership status
// Mock current membership status (FALLBACK if fetch fails, but state will control this)
const DUMMY_MEMBERSHIP = {
  hasMembership: false,
  status: "EXPIRED",
  plan: null,
  startDate: "",
  endDate: "",
  totalBorrowed: 0,
  currentBorrowed: 0,
  fineBalance: 0,
};

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState("borrowed");
  const [showDigitalLibrary, setShowDigitalLibrary] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [membership, setMembership] = useState<any>(null); // Extended Membership type
  const [myBooks, setMyBooks] = useState<LibraryTransaction[]>([]);
  const [myReservations, setMyReservations] = useState<LibraryReservation[]>(
    [],
  );
  const [digitalBooks, setDigitalBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [allPhysicalBooks, setAllPhysicalBooks] = useState<LibraryBook[]>([]);
  const settingsAnim = useRef(new Animated.Value(0)).current;

  const user = useSelector((state: RootState) => state.auth.user);

 

  const openSettings = () => {
    setShowSettingsModal(true);
    Animated.spring(settingsAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const closeSettings = (callback?: () => void) => {
    Animated.timing(settingsAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowSettingsModal(false);
      callback?.();
    });
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [fetchedPlans, myMemberships, fetchedBooks, allLibraryBooks] =
        await Promise.all([
          membershipService.getLibraryPlans(),
          membershipService.getMyMemberships(),
          libraryService.getMyBooks("ALL"),
          libraryService.getAllBooks(),
        ]);
      setPlans(fetchedPlans);
      setMyBooks(fetchedBooks.transactions || []);
      setMyReservations(fetchedBooks.reservations || []);
      setDigitalBooks(allLibraryBooks.filter((b) => b.isDigital));
      setAllPhysicalBooks(allLibraryBooks.filter((b) => !b.isDigital));

      const activeLibMem = myMemberships.library.find(
        (m) => m.status === "ACTIVE",
      );
      if (activeLibMem) {
        // Hydrate with plan details
        const planDetails = fetchedPlans.find(
          (p) => p.name === activeLibMem.planName,
        );
        const displayInfo = planDetails ? getPlanDisplayInfo(planDetails) : {};
        setMembership({
          ...activeLibMem,
          hasMembership: true,
          plan: { ...planDetails, ...displayInfo },
          endDate: new Date(activeLibMem.endDate).toDateString(),
          // Dummies for now
          totalBorrowed: fetchedBooks.transactions?.length || 0,
          currentBorrowed: (fetchedBooks.transactions || []).filter(
            (b) =>
              b.transactionStatus === "BORROWED" ||
              b.transactionStatus === "OVERDUE",
          ).length,
          fineBalance: (fetchedBooks.transactions || []).reduce(
            (acc, b) => acc + b.fineAmount,
            0,
          ),
        });
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error("Failed to fetch library data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    try {
      await membershipService.subscribeToPlan(selectedPlan.id, "LIBRARY");
      // Ideally show success/payment flow. For now just refresh or close.
      setShowPlanModal(false);
      fetchData(); // Refresh to see PENDING status or logic
      alert("Subscription request sent! Please complete payment.");
    } catch (error) {
      alert("Failed to subscribe");
    }
  };

  const handleDownload = async (book: LibraryBook) => {
    try {
      const { downloadUrl } = await libraryService.downloadBook(book.id);
      if (downloadUrl) {
        // In a real app, use Linking.openURL or FileSystem.downloadAsync
        alert(`Opening ${book.title}...`);
        console.log("Downloading from:", downloadUrl);
      } else {
        alert("Download link not available");
      }
    } catch (error: any) {
      alert(error.message || "Failed to download book");
    }
  };

  const handleReserve = async (book: LibraryBook) => {
    try {
      setIsLoading(true);
      await libraryService.reserveBook(book.id);
      alert("Book reserved successfully! Please collect it within 24 hours.");
      fetchData(); // Refresh data
      setShowExploreModal(false);
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to reserve book",
      );
    } finally {
      setIsLoading(false);
    }
  };

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

  const borrowedBooks = myBooks.filter(
    (b) =>
      b.transactionStatus === "BORROWED" && new Date(b.dueDate) >= new Date(),
  );
  const overdueBooks = myBooks.filter(
    (b) =>
      b.transactionStatus === "OVERDUE" ||
      (b.transactionStatus === "BORROWED" && new Date(b.dueDate) < new Date()),
  );
  const historyBooks = myBooks.filter(
    (b) => b.transactionStatus === "RETURNED",
  );

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderMembershipCard = () => {
    if (!membership || !membership.hasMembership) {
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

    const plan = membership.plan;
    const isActive = membership.status === "ACTIVE";

    return (
      <Pressable onPress={flipCard} style={styles.cardContainer}>
        {/* Front Side */}
        <Animated.View
          style={[styles.card, styles.cardFace, frontAnimatedStyle]}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardLabel}>HABITAT LIBRARY</Text>
              <Text style={styles.cardName}>{user?.name}</Text>
              <Text style={styles.cardId}>
                ID: {membership.id.slice(0, 11).toUpperCase()}
              </Text>
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
                <Text style={styles.statusText}>{membership.status}</Text>
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
                <Text style={styles.cardBackValue}>{membership.endDate}</Text>
              </View>
            </View>

            <View style={styles.cardBackRow}>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>BOOKS BORROWED</Text>
                <Text style={styles.cardBackValue}>
                  {membership.totalBorrowed} total
                </Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>CURRENT</Text>
                <Text style={styles.cardBackValue}>
                  {membership.currentBorrowed}/{plan.maxBooks || 2}
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
                      color: membership.fineBalance > 0 ? "#EF4444" : "#22C55E",
                    },
                  ]}
                >
                  ₹{membership.fineBalance}
                </Text>
              </View>
              <View style={styles.cardBackItem}>
                <Text style={styles.cardBackLabel}>FINE/DAY</Text>
                <Text style={styles.cardBackValue}>
                  ₹{plan.finePerDay || 0}
                </Text>
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
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Your Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {plans.map((item) => {
                const displayInfo = getPlanDisplayInfo(item);
                const plan = { ...item, ...displayInfo };
                return (
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
                        <Text style={styles.planDuration}>
                          /{plan.duration}
                        </Text>
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
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.subscribeBtn,
                !selectedPlan && styles.subscribeBtnDisabled,
              ]}
              disabled={!selectedPlan}
              onPress={handleSubscribe}
            >
              <Text style={styles.subscribeBtnText}>
                {membership && membership.hasMembership
                  ? "Change Plan"
                  : "Subscribe Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <View style={styles.headerActions}>
          {membership && membership.hasMembership && (
            <TouchableOpacity
              style={styles.manageMembershipBtn}
              onPress={openSettings}
            >
              <Feather name="settings" size={22} color="#0F172A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Membership Card */}
        {renderMembershipCard()}

        {/* Quick Actions */}
        {membership && membership.hasMembership && (
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: "#DBEAFE" }]}
              onPress={() => setShowExploreModal(true)}
            >
              <Feather name="book-open" size={24} color="#2563EB" />
              <Text style={[styles.quickActionText, { color: "#2563EB" }]}>
                Explore
              </Text>
            </TouchableOpacity>

            {membership.plan.tier !== "BRONZE" && (
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: "#F3E8FF" }]}
                onPress={() => setShowDigitalLibrary(true)}
              >
                <Feather name="download-cloud" size={24} color="#7C3AED" />
                <Text style={[styles.quickActionText, { color: "#7C3AED" }]}>
                  Digital
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search Bar */}
        {membership && membership.hasMembership && (
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
        {membership && membership.hasMembership && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScrollContainer}
              contentContainerStyle={styles.tabs}
            >
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

              <TouchableOpacity
                onPress={() => setActiveTab("reservations")}
                style={styles.tabItem}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "reservations" && styles.tabTextActive,
                  ]}
                >
                  Reserved ({myReservations.length})
                </Text>
                {activeTab === "reservations" && (
                  <View style={styles.activeLine} />
                )}
              </TouchableOpacity>
            </ScrollView>

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
                      {/* Renew button disabled for new physical schema */}
                    </View>
                  );
                })}

              {activeTab === "overdue" &&
                overdueBooks.map((book) => {
                  const daysOverdue = Math.abs(getDaysUntilDue(book.dueDate));
                  const fine = daysOverdue * (membership.plan.finePerDay || 5);
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
                      {/* Return button removed - must return at issue desk */}
                    </View>
                  );
                })}

              {activeTab === "history" &&
                historyBooks.map((book) => (
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
                        Returned:{" "}
                        {book.returnDate
                          ? new Date(book.returnDate).toDateString()
                          : "-"}
                      </Text>
                    </View>
                  </View>
                ))}

              {activeTab === "reservations" &&
                myReservations.map((res: any) => {
                  const hoursLeft = Math.max(
                    0,
                    Math.floor(
                      (new Date(res.expiresAt).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60),
                    ),
                  );
                  return (
                    <View key={res.id} style={styles.bookItem}>
                      <View
                        style={[
                          styles.bookCover,
                          { backgroundColor: "#F3E8FF" },
                        ]}
                      >
                        <Feather name="clock" size={24} color="#7C3AED" />
                      </View>
                      <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle}>
                          {res.bookDetails?.title || "Unknown Book"}
                        </Text>
                        <Text style={styles.bookAuthor}>
                          Ticket: {res.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <Text
                          style={[
                            styles.bookDue,
                            { color: hoursLeft <= 2 ? "#DC2626" : "#7C3AED" },
                          ]}
                        >
                          Expires in {hoursLeft} hrs
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.renewBtn,
                          { backgroundColor: "#7C3AED" },
                        ]}
                        onPress={() => {
                          setSelectedReservationId(res.id);
                          setShowQrModal(true);
                        }}
                      >
                        <Text style={[styles.renewText, { color: "white" }]}>
                          Show QR
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>
          </>
        )}
      </ScrollView>

      {renderPlanModal()}

      <DigitalLibraryModal
        visible={showDigitalLibrary}
        onClose={() => setShowDigitalLibrary(false)}
        books={digitalBooks}
        onDownload={handleDownload}
      />

      <ExploreLibraryModal
        visible={showExploreModal}
        onClose={() => setShowExploreModal(false)}
        books={allPhysicalBooks}
        onReserve={handleReserve}
      />

      <ReservationQRModal
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
        reservationId={selectedReservationId}
      />

      {/* Settings Dropdown */}
      {showSettingsModal && (
        <>
          <BlurView intensity={60} tint="light" style={styles.settingsBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => closeSettings()}
            />
          </BlurView>
          <Animated.View
            style={[
              styles.settingsDropdown,
              {
                opacity: settingsAnim,
                transform: [
                  {
                    scale: settingsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                  {
                    translateY: settingsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.settingsOption}
              onPress={() => closeSettings(() => setShowPlanModal(true))}
            >
              <Feather name="arrow-up" size={20} color="#7C3AED" />
              <Text style={styles.settingsOptionText}>Upgrade Plan</Text>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsOption}
              onPress={() => closeSettings(() => setShowPlanModal(true))}
            >
              <Feather name="refresh-cw" size={20} color="#2563EB" />
              <Text style={styles.settingsOptionText}>Renew Plan</Text>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsOption}
              onPress={() => closeSettings(() => setShowPlanModal(true))}
            >
              <Feather name="x-circle" size={20} color="#EF4444" />
              <Text style={[styles.settingsOptionText, { color: "#EF4444" }]}>
                Cancel Plan
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    padding: 8,
    borderRadius: 12,
  },
  settingsBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
    zIndex: 999,
  },
  settingsDropdown: {
    position: "absolute",
    top: 75,
    right: 20,
    backgroundColor: "white",
    borderRadius: 16,
    width: 200,
    paddingVertical: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    zIndex: 1000,
    transformOrigin: "top right",
  },
  settingsOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  settingsOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  settingsDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
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

  // Quick Actions
  quickActionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
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
  tabsScrollContainer: {
    marginBottom: 20,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
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
