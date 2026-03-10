import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";

/** One cell on the back of the card */
export interface BackItem {
  label: string;
  value: string | number;
  /** Render value in green */
  highlight?: boolean;
}

interface FlipIdCardProps {
  // Front side
  name?: string;
  organization?: string;
  hostel?: string;
  /** Small text under the name (e.g. enrollment number or role) */
  subLabel?: string;
  /** Blue badge text (e.g. department or specialization) */
  badge?: string;
  // Back side
  /** Title shown in the back header (e.g. "RESIDENCE DETAILS") */
  backTitle: string;
  profilePic?: string;
  /**
   * Items displayed in a 2-column grid on the back.
   * Pass them in row-pair order: [col1-row1, col2-row1, col1-row2, ...]
   * An odd last item spans a full row on its own.
   */
  backItems: BackItem[];
}

export function FlipIdCard({
  name,
  organization,
  hostel,
  profilePic,
  subLabel,
  badge,
  backTitle,
  backItems,
}: FlipIdCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
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

  // Group items into pairs for 2-column layout
  const rows: BackItem[][] = [];
  for (let i = 0; i < backItems.length; i += 2) {
    rows.push(backItems.slice(i, i + 2));
  }

  return (
    <Pressable onPress={flipCard} style={styles.cardContainer}>
      {/* ── FRONT ── */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFace,
          { transform: [{ rotateY: frontInterpolate }] },
        ]}
      >
        {/* Header */}
        <View style={styles.idHeader}>
          <View style={styles.collegeLogo}>
            <Feather name="award" size={20} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.collegeOrg}>{organization}</Text>
            <Text style={styles.collegeHostel}>{hostel}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>ACTIVE</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.idBody}>
          <View style={styles.avatar}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <Feather name="user" size={36} color="#94A3B8" />
            )}
          </View>
          <View style={styles.idDetails}>
            <Text style={styles.personName}>{name}</Text>
            {!!subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
            {!!badge && (
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <Feather name="refresh-cw" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.tapHintText}>Tap to flip</Text>
        </View>
      </Animated.View>

      {/* ── BACK ── */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFace,
          styles.cardBack,
          { transform: [{ rotateY: backInterpolate }] },
        ]}
      >
        <View style={styles.cardBackHeader}>
          <Feather name="info" size={18} color="#94A3B8" />
          <Text style={styles.cardBackTitle}>{backTitle}</Text>
        </View>

        <View style={styles.cardBackContent}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.cardBackRow}>
              {row.map((item, colIdx) => (
                <View key={colIdx} style={styles.cardBackItem}>
                  <Text style={styles.cardBackLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.cardBackValue,
                      item.highlight && { color: "#22C55E" },
                    ]}
                  >
                    {String(item.value)}
                  </Text>
                </View>
              ))}
              {/* If odd number of items, fill second column with empty space */}
              {row.length === 1 && <View style={styles.cardBackItem} />}
            </View>
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: { marginBottom: 24 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
    justifyContent: "space-between",
    shadowColor: "#1E293B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardFace: { backfaceVisibility: "hidden" },
  cardBack: { position: "absolute", top: 0, left: 0, right: 0 },

  // Front
  idHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  collegeLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  collegeOrg: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 11,
  },
  collegeHostel: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statusBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: "white",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  idBody: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#475569",
  },
  avatar: {
    height: 74,
    width: 74,
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 47,
  },
  idDetails: { marginLeft: 16, flex: 1 },
  personName: { color: "white", fontSize: 20, fontWeight: "bold" },
  subLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  badgeRow: { flexDirection: "row" },
  badge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  tapHintText: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 4 },

  // Back
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
  cardBackContent: { flex: 1 },
  cardBackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardBackItem: { flex: 1 },
  cardBackLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  cardBackValue: { fontSize: 16, color: "white", fontWeight: "700" },
});
