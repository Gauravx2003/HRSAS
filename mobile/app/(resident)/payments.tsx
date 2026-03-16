import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import RazorpayCheckout from "react-native-razorpay";
import {
  getMyPayments,
  createRazorpayOrder,
  verifyPayment,
  Payment,
  PaymentCategory,
} from "../../src/services/payments.service";

const FINE_CATEGORIES: PaymentCategory[] = ["FINE", "LIBRARY_FINE"];

const CATEGORY_CONFIG: Record<
  PaymentCategory,
  { label: string; icon: string; color: string; bg: string }
> = {
  FINE: {
    label: "Fine",
    icon: "alert-triangle",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  LIBRARY_FINE: {
    label: "Library Fine",
    icon: "book-open",
    color: "#9333EA",
    bg: "#FAF5FF",
  },
  HOSTEL_FEE: {
    label: "Hostel Fee",
    icon: "home",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  MESS_FEE: {
    label: "Mess Fee",
    icon: "coffee",
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  SECURITY_DEPOSIT: {
    label: "Security Deposit",
    icon: "shield",
    color: "#059669",
    bg: "#ECFDF5",
  },
  LIBRARY_MEMBERSHIP: {
    label: "Library Membership",
    icon: "book",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  GYM_MEMBERSHIP: {
    label: "Gym Membership",
    icon: "activity",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING: { label: "Pending", color: "#D97706", bg: "#FFFBEB" },
  COMPLETED: { label: "Paid", color: "#059669", bg: "#ECFDF5" },
  WAIVED: { label: "Waived", color: "#7C3AED", bg: "#F5F3FF" },
  FAILED: { label: "Failed", color: "#DC2626", bg: "#FEF2F2" },
};

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"fines" | "payments">("fines");
  let isProcessing = false;

  // Track which payment is currently being processed to show a spinner on its button
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handlePayment = async (item: Payment) => {
    try {
      setProcessingId(item.id);
      const orderData = await createRazorpayOrder(item.id, item.amount);

      //Configure Razorpay Options
      const options = {
        description:
          item.description ||
          `Payment for ${CATEGORY_CONFIG[item.category].label}`,
        currency: "INR",
        amount: orderData.amount,
        name: "Habitat",
        order_id: orderData.orderId,
        theme: { color: "#2563EB" },
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
      };

      // Handle the Promise correctly
      RazorpayCheckout.open(options as any)
        .then(async (data: any) => {
          // This block only runs on a SUCCESSFUL payment
          try {
            await verifyPayment({
              paymentId: item.id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpayOrderId: data.razorpay_order_id,
              razorpaySignature: data.razorpay_signature,
            });
            Alert.alert("Success", "Payment verified successfully");
            fetchPayments();
          } catch (error: any) {
            console.error(
              "Payment verification failed:",
              error.response?.data?.message,
            );
            Alert.alert(
              "Error",
              "Payment verification failed. If money was deducted, contact admin.",
            );
          } finally {
            setProcessingId(null);
          }
        })
        .catch((error: any) => {
          // This block runs when the user CANCELS or the payment FAILS
          setProcessingId(null);

          let errorDescription = "Payment was cancelled or failed.";

          try {
            // Razorpay often sends the description as a stringified JSON object
            const parsedError = JSON.parse(error.description);
            if (parsedError.error && parsedError.error.description) {
              errorDescription = parsedError.error.description;
            }
          } catch (e) {
            // If it's not JSON, just use the raw string or default message
            if (
              typeof error.description === "string" &&
              error.description !== "undefined"
            ) {
              errorDescription = error.description;
            }
          }

          // Don't show an aggressive error if they just pressed the back button
          if (
            error.code === 0 ||
            errorDescription.toLowerCase().includes("cancel")
          ) {
            console.log("User cancelled payment.");
            // You can optionally show a toast here, or just do nothing.
          } else {
            Alert.alert("Payment Failed", errorDescription);
          }
        });
    } catch (e) {
      // This catch block handles errors from your own backend (createRazorpayOrder)
      console.error("Failed to initialize payment order:", e);
      Alert.alert("Error", "Could not initialize payment. Please try again.");
      setProcessingId(null);
    }
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyPayments();
      // Sort by newest first
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setPayments(data);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [fetchPayments]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    isProcessing = false;
    setProcessingId(null);
    fetchPayments();
  };

  // Derived data
  const fines = payments.filter((p) => FINE_CATEGORIES.includes(p.category));
  const otherPayments = payments.filter(
    (p) => !FINE_CATEGORIES.includes(p.category),
  );

  const totalDue = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingFinesCount = fines.filter((p) => p.status === "PENDING").length;

  const currentData = activeTab === "fines" ? fines : otherPayments;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderPaymentCard = ({ item }: { item: Payment }) => {
    const cat = CATEGORY_CONFIG[item.category];
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
    const isFine = FINE_CATEGORIES.includes(item.category);
    const isPending = item.status === "PENDING";
    isProcessing = processingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
            <Feather name={cat.icon as any} size={20} color={cat.color} />
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardCategory}>{cat.label}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description || "No description"}
            </Text>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Amount & Status */}
          <View style={styles.cardRight}>
            <Text
              style={[styles.cardAmount, isPending && { color: "#DC2626" }]}
            >
              ₹{item.amount}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Pay Button for pending items */}
        {isPending && isFine && (
          <TouchableOpacity
            style={styles.payButton}
            activeOpacity={0.7}
            onPress={() => handlePayment(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Feather
                name="credit-card"
                size={16}
                color="#FFF"
                style={{ marginRight: 6 }}
              />
            )}
            <Text style={styles.payButtonText}>
              {isProcessing ? "Processing..." : "Pay Now"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Payments</Text>

      {/* Summary Header */}
      <LinearGradient
        colors={["#1E3A5F", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={styles.summaryAmount}>₹{totalDue}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryAmount, { color: "#86EFAC" }]}>
              ₹{totalPaid}
            </Text>
          </View>
        </View>
        {pendingFinesCount > 0 && (
          <View style={styles.pendingBanner}>
            <Feather name="alert-circle" size={14} color="#FCD34D" />
            <Text style={styles.pendingBannerText}>
              {pendingFinesCount} pending fine{pendingFinesCount > 1 ? "s" : ""}{" "}
              to clear
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "fines" && styles.tabActive]}
          onPress={() => setActiveTab("fines")}
        >
          <Feather
            name="alert-triangle"
            size={14}
            color={activeTab === "fines" ? "#DC2626" : "#64748B"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={
              activeTab === "fines"
                ? styles.tabTextActive
                : styles.tabTextInactive
            }
          >
            Fines
          </Text>
          {fines.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === "fines" ? "#FEE2E2" : "#E2E8F0",
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  { color: activeTab === "fines" ? "#DC2626" : "#64748B" },
                ]}
              >
                {fines.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "payments" && styles.tabActive]}
          onPress={() => setActiveTab("payments")}
        >
          <Feather
            name="credit-card"
            size={14}
            color={activeTab === "payments" ? "#2563EB" : "#64748B"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={
              activeTab === "payments"
                ? [styles.tabTextActive, { color: "#0F172A" }]
                : styles.tabTextInactive
            }
          >
            Payments
          </Text>
          {otherPayments.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === "payments" ? "#DBEAFE" : "#E2E8F0",
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  { color: activeTab === "payments" ? "#2563EB" : "#64748B" },
                ]}
              >
                {otherPayments.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Feather
                  name={activeTab === "fines" ? "check-circle" : "inbox"}
                  size={40}
                  color="#CBD5E1"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "fines" ? "No Fines!" : "No Payments"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "fines"
                  ? "You have no fines on your record. Keep it up!"
                  : "No payment records found."}
              </Text>
            </View>
          }
        />
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
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
  },

  // Summary Card
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  summaryAmount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  pendingBannerText: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabTextActive: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 14,
  },
  tabTextInactive: {
    fontWeight: "600",
    color: "#64748B",
    fontSize: 14,
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardCategory: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Pay Button
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
});
