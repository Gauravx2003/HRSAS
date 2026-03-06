import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";

import {
  getAvailableListings,
  createListing,
  uploadItemImages,
  getMyListings,
  getMyBids,
  placeBid,
  acceptBid,
  confirmHandover,
  cancelHandover,
  deleteListing,
  MarketplaceItem,
  Bid,
  ItemCondition,
} from "../../src/services/marketplace.service";

interface DummyChatMessage {
  id: string;
  text: string;
  isMe: boolean;
  time: string;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;

const CATEGORIES = [
  "Electronics",
  "Books",
  "Furniture",
  "Clothing",
  "Sports",
  "Appliances",
  "Other",
];
const CONDITIONS: { label: string; value: ItemCondition }[] = [
  { label: "New", value: "NEW" },
  { label: "Like New", value: "LIKE_NEW" },
  { label: "Good", value: "GOOD" },
  { label: "Fair", value: "FAIR" },
  { label: "Poor", value: "POOR" },
];

const CONDITION_COLORS: Record<ItemCondition, { bg: string; text: string }> = {
  NEW: { bg: "#ECFDF5", text: "#059669" },
  LIKE_NEW: { bg: "#EFF6FF", text: "#2563EB" },
  GOOD: { bg: "#FFFBEB", text: "#D97706" },
  FAIR: { bg: "#FFF7ED", text: "#EA580C" },
  POOR: { bg: "#FEF2F2", text: "#DC2626" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: "#ECFDF5", text: "#059669" },
  PENDING_HANDOVER: { bg: "#FFFBEB", text: "#D97706" },
  SOLD: { bg: "#F3F4F6", text: "#6B7280" },
  CANCELLED: { bg: "#FEF2F2", text: "#DC2626" },
};

export default function MarketplaceScreen() {
  const [activeTab, setActiveTab] = useState<"browse" | "sell" | "history">(
    "browse",
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── BROWSE TAB STATE ───
  const [listings, setListings] = useState<MarketplaceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ─── SELL TAB STATE ───
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("GOOD");
  const [images, setImages] = useState<string[]>([]);

  // ─── HISTORY TAB STATE ───
  const [myItems, setMyItems] = useState<MarketplaceItem[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [historySubTab, setHistorySubTab] = useState<"biddings" | "listings">(
    "biddings",
  );

  // ─── MODALS ───
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerItem, setOfferItem] = useState<MarketplaceItem | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  const [bidsModalVisible, setBidsModalVisible] = useState(false);
  const [bidsItem, setBidsItem] = useState<MarketplaceItem | null>(null);

  const [viewerImage, setViewerImage] = useState<string | null>(null);

  // ─── CHAT MODAL (DUMMY) ───
  const [chatVisible, setChatVisible] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<DummyChatMessage[]>([
    {
      id: "1",
      text: "Hi! When can we meet for the handover?",
      isMe: false,
      time: "10:30 AM",
    },
    {
      id: "2",
      text: "I can come by this evening around 6 PM",
      isMe: true,
      time: "10:32 AM",
    },
    {
      id: "3",
      text: "Sounds good! I'll be in the common room",
      isMe: false,
      time: "10:33 AM",
    },
  ]);

  // ─── FETCHING DATA ───

  const fetchBrowse = async () => {
    try {
      setLoading(true);
      const data = await getAvailableListings();
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const data = await getMyListings();
      setMyItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBids = async () => {
    try {
      setLoading(true);
      const data = await getMyBids();
      setMyBids(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "browse") fetchBrowse();
      if (activeTab === "history") {
        fetchMyListings();
        fetchMyBids();
      }
    }, [activeTab]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    const fn =
      activeTab === "browse"
        ? fetchBrowse()
        : activeTab === "history"
          ? Promise.all([fetchMyListings(), fetchMyBids()])
          : Promise.resolve();
    fn.then(() => setRefreshing(false));
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    setChatMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        text: chatInput.trim(),
        isMe: true,
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
  };

  const openChat = (title: string) => {
    setChatTitle(title);
    setChatVisible(true);
  };

  // ─── SELL ACTIONS ───

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const handleCreateListing = async () => {
    if (!title || !description) {
      Alert.alert("Missing Fields", "Please fill in title and description.");
      return;
    }
    try {
      setLoading(true);
      const res = await createListing({
        title,
        description,
        category,
        price: price ? Number(price) : 0,
        condition,
      });

      // Upload images if any
      if (images.length > 0 && res.item?.id) {
        try {
          await uploadItemImages(res.item.id, images);
        } catch (imgErr) {
          console.error("Image upload failed:", imgErr);
        }
      }

      Alert.alert("Success!", "Your item is now listed.");
      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setImages([]);
      setCondition("GOOD");
      setCategory("Electronics");
      setActiveTab("history");
      setHistorySubTab("listings");
      fetchMyListings();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to list item.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── BIDDING ACTIONS ───

  const openOfferModal = (item: MarketplaceItem) => {
    setOfferItem(item);
    setOfferPrice(item.price > 0 ? String(item.price) : "");
    setOfferMessage("");
    setOfferModalVisible(true);
  };

  const handlePlaceBid = async () => {
    if (!offerItem) return;
    if (!offerPrice || Number(offerPrice) < 0) {
      Alert.alert("Invalid", "Please enter a valid price.");
      return;
    }
    try {
      setLoading(true);
      await placeBid(
        offerItem.id,
        Number(offerPrice),
        offerMessage || undefined,
      );
      Alert.alert("Offer Sent!", "The seller will review your offer.");
      setOfferModalVisible(false);
      fetchBrowse();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to place offer.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── SELLER ACTIONS ───

  const openBidsModal = (item: MarketplaceItem) => {
    setBidsItem(item);
    setBidsModalVisible(true);
  };

  const handleAcceptBid = async (bidId: string) => {
    Alert.alert("Accept Offer", "Accept this offer and move to handover?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          try {
            await acceptBid(bidId);
            Alert.alert("Accepted!", "Item is now pending handover.");
            setBidsModalVisible(false);
            fetchMyListings();
          } catch (error: any) {
            Alert.alert(
              "Error",
              error.response?.data?.message || "Failed to accept.",
            );
          }
        },
      },
    ]);
  };

  const handleConfirmHandover = async (itemId: string) => {
    Alert.alert(
      "Confirm Sale",
      "Has the handover been completed successfully?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await confirmHandover(itemId);
              Alert.alert("Sold!", "Item marked as sold.");
              fetchMyListings();
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.message || "Failed.");
            }
          },
        },
      ],
    );
  };

  const handleCancelHandover = async (itemId: string) => {
    Alert.alert(
      "Cancel Handover",
      "Buyer didn't show? This will relist the item.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Relist",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelHandover(itemId);
              Alert.alert("Relisted", "Item is available again.");
              fetchMyListings();
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.message || "Failed.");
            }
          },
        },
      ],
    );
  };

  const handleDeleteListing = async (itemId: string) => {
    Alert.alert(
      "Remove Listing",
      "Are you sure you want to remove this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteListing(itemId);
              Alert.alert("Removed", "Listing has been removed.");
              fetchMyListings();
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.message || "Failed.");
            }
          },
        },
      ],
    );
  };

  // ─── FILTERED DATA ───
  const filteredListings = selectedCategory
    ? listings.filter((i) => i.category === selectedCategory)
    : listings;

  // ─── RENDERERS ───

  const renderBrowseItem = ({ item }: { item: MarketplaceItem }) => {
    const hasImages = item.attachments && item.attachments.length > 0;
    const condColor = CONDITION_COLORS[item.condition] || CONDITION_COLORS.GOOD;
    const isFree = item.price === 0;

    return (
      <View style={s.card}>
        {/* Image Section */}
        {hasImages ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setViewerImage(item.attachments![0].fileURL)}
          >
            <Image
              source={{ uri: item.attachments![0].fileURL }}
              style={s.cardImage}
              resizeMode="cover"
            />
            {/* Image count badge */}
            {item.attachments!.length > 1 && (
              <View style={s.imageCountBadge}>
                <Feather name="image" size={12} color="white" />
                <Text style={s.imageCountText}>{item.attachments!.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[s.cardImage, s.noImagePlaceholder]}>
            <Feather name="camera-off" size={32} color="#D1D5DB" />
            <Text style={{ color: "#9CA3AF", marginTop: 8, fontSize: 13 }}>
              No photos
            </Text>
          </View>
        )}

        {/* Price Badge Overlay */}
        <View style={[s.priceBadge, isFree && s.freeBadge]}>
          <Text style={[s.priceText, isFree && s.freeText]}>
            {isFree ? "FREE" : `₹${item.price}`}
          </Text>
        </View>

        {/* Card Body */}
        <View style={s.cardBody}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[s.conditionPill, { backgroundColor: condColor.bg }]}>
              <Text style={[s.conditionText, { color: condColor.text }]}>
                {item.condition.replace("_", " ")}
              </Text>
            </View>
          </View>

          <Text style={s.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Multiple Image Thumbnails */}
          {hasImages && item.attachments!.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.thumbRow}
            >
              {item.attachments!.map((att) => (
                <TouchableOpacity
                  key={att.id}
                  onPress={() => setViewerImage(att.fileURL)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: att.fileURL }} style={s.thumbImg} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Seller Info & CTA */}
          <View style={s.cardFooter}>
            <View style={s.sellerRow}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>
                  {item.seller?.name?.charAt(0) || "?"}
                </Text>
              </View>
              <View>
                <Text style={s.sellerName}>{item.seller?.name}</Text>
                <Text style={s.cardDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.offerBtn}
              onPress={() => openOfferModal(item)}
              activeOpacity={0.8}
            >
              <Feather name="send" size={14} color="white" />
              <Text style={s.offerBtnText}>Make Offer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderMyItem = ({ item }: { item: MarketplaceItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.AVAILABLE;
    const bidCount = item.bids?.length || 0;
    const pendingBids =
      item.bids?.filter((b) => b.status === "PENDING").length || 0;
    const hasImages = item.attachments && item.attachments.length > 0;

    return (
      <View style={s.myCard}>
        <View style={s.myCardHeader}>
          {hasImages ? (
            <Image
              source={{ uri: item.attachments![0].fileURL }}
              style={s.myCardThumb}
            />
          ) : (
            <View style={[s.myCardThumb, s.noImageSmall]}>
              <Feather name="package" size={20} color="#9CA3AF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.myCardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.myCardPrice}>
              {item.price === 0 ? "FREE" : `₹${item.price}`}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[s.statusText, { color: statusColor.text }]}>
              {item.status.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Bid summary */}
        {item.status === "AVAILABLE" && bidCount > 0 && (
          <TouchableOpacity
            style={s.bidSummaryRow}
            onPress={() => openBidsModal(item)}
          >
            <View style={s.bidBadge}>
              <Feather name="users" size={13} color="#4F46E5" />
              <Text style={s.bidBadgeText}>
                {pendingBids} pending offer{pendingBids !== 1 ? "s" : ""}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#4F46E5" />
          </TouchableOpacity>
        )}

        {/* PENDING_HANDOVER actions */}
        {item.status === "PENDING_HANDOVER" && (
          <View style={s.handoverActions}>
            <View style={s.handoverInfo}>
              <Feather name="clock" size={14} color="#D97706" />
              <Text style={s.handoverInfoText}>Awaiting handover</Text>
            </View>
            <View style={s.handoverBtns}>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={() => handleConfirmHandover(item.id)}
              >
                <Feather name="check" size={14} color="white" />
                <Text style={s.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => handleCancelHandover(item.id)}
              >
                <Feather name="x" size={14} color="#DC2626" />
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={s.chatBtn}
              onPress={() => openChat(item.title)}
            >
              <Feather name="message-circle" size={14} color="#4F46E5" />
              <Text style={s.chatBtnText}>Chat with Buyer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AVAILABLE: view bids + delete */}
        {item.status === "AVAILABLE" && (
          <View style={s.myCardActions}>
            <TouchableOpacity
              style={s.viewBidsBtn}
              onPress={() => openBidsModal(item)}
            >
              <Feather name="eye" size={14} color="#4F46E5" />
              <Text style={s.viewBidsBtnText}>View Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteBtnSmall}
              onPress={() => handleDeleteListing(item.id)}
            >
              <Feather name="trash-2" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── MAIN RENDER ───

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={["#1E1B4B", "#312E81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Text style={s.headerTitle}>Marketplace</Text>
        <Text style={s.headerSub}>Buy, sell & trade within your hostel</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabContainer}>
        {(
          [
            { key: "browse", label: "Browse", icon: "search" },
            { key: "sell", label: "Sell", icon: "plus-circle" },
            { key: "history", label: "History", icon: "clock" },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Feather
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? "#4F46E5" : "#9CA3AF"}
            />
            <Text
              style={
                activeTab === tab.key ? s.tabTextActive : s.tabTextInactive
              }
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={s.content}>
        {/* ─── BROWSE TAB ─── */}
        {activeTab === "browse" && (
          <>
            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
              style={{ flexGrow: 0 }}
            >
              <TouchableOpacity
                style={[s.filterChip, !selectedCategory && s.filterChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    s.filterText,
                    !selectedCategory && s.filterTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.filterChip,
                    selectedCategory === cat && s.filterChipActive,
                  ]}
                  onPress={() =>
                    setSelectedCategory(selectedCategory === cat ? null : cat)
                  }
                >
                  <Text
                    style={[
                      s.filterText,
                      selectedCategory === cat && s.filterTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredListings}
              keyExtractor={(item) => item.id}
              renderItem={renderBrowseItem}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                loading ? (
                  <ActivityIndicator
                    size="large"
                    color="#4F46E5"
                    style={{ marginTop: 60 }}
                  />
                ) : (
                  <View style={s.emptyState}>
                    <Feather name="shopping-bag" size={48} color="#D1D5DB" />
                    <Text style={s.emptyTitle}>No items yet</Text>
                    <Text style={s.emptyText}>
                      Be the first to list something!
                    </Text>
                  </View>
                )
              }
            />
          </>
        )}

        {/* ─── SELL TAB ─── */}
        {activeTab === "sell" && (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={
              <View style={s.form}>
                <Text style={s.formTitle}>List an Item</Text>

                <Text style={s.label}>Title *</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. JBL Speaker, Desk Lamp"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={s.label}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.catChip, category === cat && s.catChipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          s.catChipText,
                          category === cat && s.catChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.label}>Condition</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                >
                  {CONDITIONS.map((c) => {
                    const col = CONDITION_COLORS[c.value];
                    return (
                      <TouchableOpacity
                        key={c.value}
                        style={[
                          s.condChip,
                          condition === c.value && {
                            backgroundColor: col.bg,
                            borderColor: col.text,
                            borderWidth: 1.5,
                          },
                        ]}
                        onPress={() => setCondition(c.value)}
                      >
                        <Text
                          style={[
                            s.condChipText,
                            condition === c.value && { color: col.text },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={s.label}>Price (₹)</Text>
                <View style={s.priceInputRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="0 = Free / Giveaway"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                  <TouchableOpacity
                    style={s.freeToggle}
                    onPress={() => setPrice("0")}
                  >
                    <Text style={s.freeToggleText}>Free</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.label}>Description *</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="Describe your item, any scratches, comes with charger, etc."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />

                <Text style={s.label}>Photos (up to 5)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.imagePickerRow}
                >
                  {images.map((uri, idx) => (
                    <View key={idx} style={s.imgPreviewWrap}>
                      <Image source={{ uri }} style={s.imgPreview} />
                      <TouchableOpacity
                        style={s.removeImgBtn}
                        onPress={() =>
                          setImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Feather name="x" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.length < 5 && (
                    <TouchableOpacity style={s.addImageBtn} onPress={pickImage}>
                      <Feather name="camera" size={24} color="#6B7280" />
                      <Text style={s.addImageText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={handleCreateListing}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Feather name="tag" size={18} color="white" />
                      <Text style={s.submitText}>List Item</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* ─── HISTORY TAB ─── */}
        {activeTab === "history" && (
          <>
            {/* Sub-tabs */}
            <View style={s.subTabRow}>
              <TouchableOpacity
                style={[
                  s.subTab,
                  historySubTab === "biddings" && s.subTabActive,
                ]}
                onPress={() => setHistorySubTab("biddings")}
              >
                <Feather
                  name="send"
                  size={14}
                  color={historySubTab === "biddings" ? "#4F46E5" : "#9CA3AF"}
                />
                <Text
                  style={
                    historySubTab === "biddings"
                      ? s.subTabTextActive
                      : s.subTabTextInactive
                  }
                >
                  My Biddings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.subTab,
                  historySubTab === "listings" && s.subTabActive,
                ]}
                onPress={() => setHistorySubTab("listings")}
              >
                <Feather
                  name="package"
                  size={14}
                  color={historySubTab === "listings" ? "#4F46E5" : "#9CA3AF"}
                />
                <Text
                  style={
                    historySubTab === "listings"
                      ? s.subTabTextActive
                      : s.subTabTextInactive
                  }
                >
                  My Listings
                </Text>
              </TouchableOpacity>
            </View>

            {historySubTab === "biddings" ? (
              <FlatList
                data={myBids}
                keyExtractor={(b) => b.id}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: bid }: { item: Bid }) => {
                  const item = bid.item;
                  const hasImg =
                    item?.attachments && item.attachments.length > 0;
                  const bidStatusColor =
                    bid.status === "ACCEPTED"
                      ? { bg: "#ECFDF5", text: "#059669" }
                      : bid.status === "REJECTED"
                        ? { bg: "#FEF2F2", text: "#DC2626" }
                        : { bg: "#FFFBEB", text: "#D97706" };
                  return (
                    <View style={s.myCard}>
                      <View style={s.myCardHeader}>
                        {hasImg ? (
                          <Image
                            source={{ uri: item!.attachments![0].fileURL }}
                            style={s.myCardThumb}
                          />
                        ) : (
                          <View style={[s.myCardThumb, s.noImageSmall]}>
                            <Feather name="package" size={20} color="#9CA3AF" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={s.myCardTitle} numberOfLines={1}>
                            {item?.title || "Unknown Item"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              marginTop: 2,
                            }}
                          >
                            by {item?.seller?.name || "Seller"}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.statusBadge,
                            { backgroundColor: bidStatusColor.bg },
                          ]}
                        >
                          <Text
                            style={[
                              s.statusText,
                              { color: bidStatusColor.text },
                            ]}
                          >
                            {bid.status}
                          </Text>
                        </View>
                      </View>

                      <View style={s.bidDetailRow}>
                        <View style={s.bidDetailItem}>
                          <Text style={s.bidDetailLabel}>Listed Price</Text>
                          <Text style={s.bidDetailValue}>
                            {item?.price === 0 ? "FREE" : `₹${item?.price}`}
                          </Text>
                        </View>
                        <View style={s.bidDetailItem}>
                          <Text style={s.bidDetailLabel}>Your Offer</Text>
                          <Text
                            style={[s.bidDetailValue, { color: "#4F46E5" }]}
                          >
                            ₹{bid.offeredPrice}
                          </Text>
                        </View>
                        <View style={s.bidDetailItem}>
                          <Text style={s.bidDetailLabel}>Date</Text>
                          <Text style={s.bidDate}>
                            {new Date(bid.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              },
                            )}
                          </Text>
                        </View>
                      </View>

                      {bid.message && (
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#6B7280",
                            fontStyle: "italic",
                            marginTop: 8,
                          }}
                        >
                          "{bid.message}"
                        </Text>
                      )}

                      {bid.status === "ACCEPTED" && (
                        <TouchableOpacity
                          style={s.chatBtn}
                          onPress={() => openChat(item?.title || "Item")}
                        >
                          <Feather
                            name="message-circle"
                            size={14}
                            color="#4F46E5"
                          />
                          <Text style={s.chatBtnText}>Chat with Seller</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  loading ? (
                    <ActivityIndicator
                      size="large"
                      color="#4F46E5"
                      style={{ marginTop: 60 }}
                    />
                  ) : (
                    <View style={s.emptyState}>
                      <Feather name="send" size={48} color="#D1D5DB" />
                      <Text style={s.emptyTitle}>No bids yet</Text>
                      <Text style={s.emptyText}>
                        Browse items and make an offer!
                      </Text>
                    </View>
                  )
                }
              />
            ) : (
              <FlatList
                data={myItems}
                keyExtractor={(item) => item.id}
                renderItem={renderMyItem}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  loading ? (
                    <ActivityIndicator
                      size="large"
                      color="#4F46E5"
                      style={{ marginTop: 60 }}
                    />
                  ) : (
                    <View style={s.emptyState}>
                      <Feather name="inbox" size={48} color="#D1D5DB" />
                      <Text style={s.emptyTitle}>No listings yet</Text>
                      <Text style={s.emptyText}>
                        Post your first item in the Sell tab!
                      </Text>
                    </View>
                  )
                }
              />
            )}
          </>
        )}
      </View>

      {/* ═══ MAKE OFFER MODAL ═══ */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setOfferModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable style={s.modalSheet} onPress={() => {}}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Make an Offer</Text>

              {offerItem && (
                <View style={s.modalItemPreview}>
                  <Text style={s.modalItemName} numberOfLines={1}>
                    {offerItem.title}
                  </Text>
                  <Text style={s.modalItemPrice}>
                    Listed at{" "}
                    {offerItem.price === 0 ? "FREE" : `₹${offerItem.price}`}
                  </Text>
                </View>
              )}

              <Text style={s.label}>Your Offer (₹)</Text>
              <TextInput
                style={s.input}
                placeholder="Enter your price"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={offerPrice}
                onChangeText={setOfferPrice}
              />

              <Text style={s.label}>Message (optional)</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="e.g. Can pick up tonight!"
                placeholderTextColor="#9CA3AF"
                multiline
                value={offerMessage}
                onChangeText={setOfferMessage}
              />

              <TouchableOpacity
                style={[s.submitBtn, { marginTop: 16 }]}
                onPress={handlePlaceBid}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="white" />
                    <Text style={s.submitText}>Send Offer</Text>
                  </>
                )}
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ═══ VIEW BIDS MODAL ═══ */}
      <Modal
        visible={bidsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBidsModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setBidsModalVisible(false)}
        >
          <Pressable
            style={[s.modalSheet, { maxHeight: "80%" }]}
            onPress={() => {}}
          >
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Incoming Offers</Text>

            {bidsItem && (
              <View style={s.modalItemPreview}>
                <Text style={s.modalItemName} numberOfLines={1}>
                  {bidsItem.title}
                </Text>
                <Text style={s.modalItemPrice}>
                  Listed at{" "}
                  {bidsItem.price === 0 ? "FREE" : `₹${bidsItem.price}`}
                </Text>
              </View>
            )}

            <FlatList
              data={bidsItem?.bids?.filter((b) => b.status === "PENDING") || []}
              keyExtractor={(b) => b.id}
              renderItem={({ item: bid }: { item: Bid }) => (
                <View style={s.bidCard}>
                  <View style={s.bidCardHeader}>
                    <View style={s.avatarCircle}>
                      <Text style={s.avatarText}>
                        {bid.buyer?.name?.charAt(0) || "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bidBuyerName}>
                        {bid.buyer?.name || "Unknown"}
                      </Text>
                      <Text style={s.bidBuyerPhone}>
                        {bid.buyer?.phone || ""}
                      </Text>
                    </View>
                    <Text style={s.bidPrice}>₹{bid.offeredPrice}</Text>
                  </View>
                  {bid.message && (
                    <Text style={s.bidMessage}>"{bid.message}"</Text>
                  )}
                  <TouchableOpacity
                    style={s.acceptBidBtn}
                    onPress={() => handleAcceptBid(bid.id)}
                  >
                    <Feather name="check-circle" size={14} color="white" />
                    <Text style={s.acceptBidBtnText}>Accept Offer</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Feather name="inbox" size={32} color="#D1D5DB" />
                  <Text style={s.emptyText}>No pending offers yet</Text>
                </View>
              }
              style={{ maxHeight: 400 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══ FULLSCREEN IMAGE VIEWER ═══ */}
      <Modal
        visible={!!viewerImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <Pressable
          style={s.imageViewerBackdrop}
          onPress={() => setViewerImage(null)}
        >
          <TouchableOpacity
            style={s.imageViewerClose}
            onPress={() => setViewerImage(null)}
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
          {viewerImage && (
            <Image
              source={{ uri: viewerImage }}
              style={s.imageViewerFull}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* ═══ DUMMY CHAT MODAL ═══ */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setChatVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "#F1F5F9" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Chat Header */}
          <View style={s.chatHeader}>
            <TouchableOpacity
              onPress={() => setChatVisible(false)}
              style={{ padding: 8, marginRight: 8 }}
            >
              <Feather name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}
              >
                Deal Chat
              </Text>
              <Text
                style={{ fontSize: 13, color: "#6B7280" }}
                numberOfLines={1}
              >
                {chatTitle}
              </Text>
            </View>
          </View>

          {/* Chat Messages */}
          <FlatList
            data={chatMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            renderItem={({ item: msg }) => (
              <View
                style={[
                  s.chatBubbleWrap,
                  msg.isMe
                    ? { alignSelf: "flex-end" }
                    : { alignSelf: "flex-start" },
                ]}
              >
                <View
                  style={[
                    s.chatBubble,
                    msg.isMe
                      ? { backgroundColor: "#4F46E5" }
                      : { backgroundColor: "white" },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      color: msg.isMe ? "white" : "#1E293B",
                    }}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      alignSelf: "flex-end",
                      marginTop: 4,
                      color: msg.isMe ? "#A5B4FC" : "#94A3B8",
                    }}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            )}
          />

          {/* Chat Input */}
          <View style={s.chatInputRow}>
            <TextInput
              style={s.chatInputField}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={chatInput}
              onChangeText={setChatInput}
              multiline
            />
            <TouchableOpacity
              style={[
                s.chatSendBtn,
                !chatInput.trim() && { backgroundColor: "#94A3B8" },
              ]}
              onPress={handleSendChat}
              disabled={!chatInput.trim()}
            >
              <Feather
                name="send"
                size={20}
                color="white"
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ FAB — Quick Sell ═══ */}
      {activeTab === "browse" && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => setActiveTab("sell")}
          activeOpacity={0.85}
        >
          <LinearGradient colors={["#4F46E5", "#7C3AED"]} style={s.fabGradient}>
            <Feather name="plus" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───

const BID_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "#FFFBEB", text: "#D97706" },
  ACCEPTED: { bg: "#ECFDF5", text: "#059669" },
  REJECTED: { bg: "#FEF2F2", text: "#DC2626" },
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  // History sub-tabs
  subTabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  subTabActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  subTabTextActive: { fontSize: 13, fontWeight: "700", color: "#4F46E5" },
  subTabTextInactive: { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },

  // Bid detail row
  bidDetailRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  bidDetailItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  bidDetailLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  bidDetailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  bidDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },

  // Chat button
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  chatBtnText: { color: "#4F46E5", fontWeight: "600", fontSize: 13 },

  // Chat modal
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 3,
  },
  chatBubbleWrap: { marginBottom: 12, maxWidth: "80%" },
  chatBubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  chatInputRow: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "flex-end",
  },
  chatInputField: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    fontSize: 15,
    color: "#1E293B",
  },
  chatSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabTextActive: { fontWeight: "700", color: "#4F46E5", fontSize: 13 },
  tabTextInactive: { fontWeight: "600", color: "#9CA3AF", fontSize: 13 },

  content: { flex: 1 },

  // Filter row
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  filterText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  filterTextActive: { color: "#4F46E5", fontWeight: "600" },

  // Browse Cards
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F3F4F6",
  },
  noImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageCountBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: { color: "white", fontSize: 12, fontWeight: "600" },

  priceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  freeBadge: { backgroundColor: "#7C3AED" },
  priceText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  freeText: { fontSize: 14 },

  cardBody: { padding: 16 },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  conditionPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  conditionText: { fontSize: 11, fontWeight: "700" },
  cardDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  thumbRow: { gap: 8, marginBottom: 12 },
  thumbImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#4F46E5", fontWeight: "700", fontSize: 15 },
  sellerName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  cardDate: { fontSize: 11, color: "#9CA3AF" },
  offerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  offerBtnText: { color: "white", fontWeight: "700", fontSize: 13 },

  // My Listings
  myCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  myCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  myCardThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  noImageSmall: {
    justifyContent: "center",
    alignItems: "center",
  },
  myCardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  myCardPrice: { fontSize: 14, fontWeight: "600", color: "#059669" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  bidSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  bidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bidBadgeText: { color: "#4F46E5", fontWeight: "600", fontSize: 13 },
  handoverActions: { marginTop: 12 },
  handoverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  handoverInfoText: { color: "#D97706", fontWeight: "600", fontSize: 13 },
  handoverBtns: { flexDirection: "row", gap: 10 },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  confirmBtnText: { color: "white", fontWeight: "700", fontSize: 13 },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelBtnText: { color: "#DC2626", fontWeight: "600", fontSize: 13 },
  myCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  viewBidsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBidsBtnText: { color: "#4F46E5", fontWeight: "600", fontSize: 13 },
  deleteBtnSmall: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },

  // Sell Form
  form: { padding: 20, paddingBottom: 40 },
  formTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    color: "#111827",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  chipRow: { gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  catChipActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#4F46E5",
  },
  catChipText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  catChipTextActive: { color: "#4F46E5", fontWeight: "700" },
  condChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  condChipText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  priceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  freeToggle: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  freeToggleText: { color: "#4F46E5", fontWeight: "700", fontSize: 14 },
  imagePickerRow: { gap: 10, paddingVertical: 4 },
  imgPreviewWrap: { position: "relative" },
  imgPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  removeImgBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addImageText: { color: "#6B7280", fontSize: 12, marginTop: 4 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: "white", fontWeight: "800", fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  modalItemPreview: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalItemName: { fontSize: 15, fontWeight: "600", color: "#374151" },
  modalItemPrice: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  // Bid Cards
  bidCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  bidCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  bidBuyerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  bidBuyerPhone: { fontSize: 12, color: "#6B7280" },
  bidPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
  },
  bidMessage: {
    fontSize: 13,
    color: "#4B5563",
    fontStyle: "italic",
    marginBottom: 10,
    paddingLeft: 46,
  },
  acceptBidBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptBidBtnText: { color: "white", fontWeight: "700", fontSize: 13 },

  // Empty State
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  emptyText: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    bottom: 30,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  // Image Viewer
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
