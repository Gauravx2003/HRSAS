import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { api } from "@/src/services/api";
import {
  getCommunityFeed,
  Post,
  voteContent,
  reportContent,
  moderatePost,
  voteOnPoll,
  joinLobby,
} from "@/src/services/communities.service";
import { Modal, TextInput } from "react-native";

// TypeScript Interfaces to match your backend exactly

export default function CommunityFeedScreen() {
  const { id, name, role } = useLocalSearchParams<{
    id: string;
    name: string;
    role: string;
  }>();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reporting State
  const [reportingItem, setReportingItem] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Join Lobby Action State
  const [joiningLobby, setJoiningLobby] = useState(false);

  const fetchFeed = async () => {
    try {
      const response = await getCommunityFeed(id!);
      setPosts(response);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load the feed.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [id]),
  );

  const handleVote = async (targetId: string, voteType: "UP" | "DOWN") => {
    const previousPosts = [...posts];

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        let newUpvotes = p.upvotes;
        let newDownvotes = p.downvotes || 0;
        let newUserVote = p.userVote;

        if (p.userVote === voteType) {
          // Removing vote
          if (voteType === "UP") newUpvotes--;
          else newDownvotes--;
          newUserVote = null;
        } else {
          // Changed or added vote
          if (p.userVote === "UP") newUpvotes--;
          if (p.userVote === "DOWN") newDownvotes--;

          if (voteType === "UP") newUpvotes++;
          else newDownvotes++;
          newUserVote = voteType;
        }

        return {
          ...p,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote as any,
        };
      }),
    );

    try {
      await voteContent("POST", targetId, voteType);
    } catch (error) {
      setPosts(previousPosts);
      Alert.alert("Error", "Failed to register vote");
    }
  };

  const submitReport = async () => {
    if (!reportingItem || !reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      await reportContent("POST", reportingItem, reportReason.trim());
      // Mark as reported in UI
      setPosts((prev) =>
        prev.map((p) =>
          p.id === reportingItem ? { ...p, isReported: true } : p,
        ),
      );
      Alert.alert("Success", "Report submitted.");
      setReportingItem(null);
      setReportReason("");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit report",
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  const handlePollVote = async (postId: string, optionId: string) => {
    // Optimistic Update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId || !p.poll) return p;

        const currentVotedId = p.poll.userVotedOptionId;
        if (currentVotedId === optionId) return p; // Already voted for this option

        const newOptions = p.poll.options.map((opt) => {
          let updatedVoteCount = opt.voteCount;
          if (opt.id === currentVotedId) updatedVoteCount--; // Remove previous vote
          if (opt.id === optionId) updatedVoteCount++; // Add new vote
          return { ...opt, voteCount: Math.max(0, updatedVoteCount) };
        });

        return {
          ...p,
          poll: {
            ...p.poll,
            options: newOptions,
            userVotedOptionId: optionId,
          },
        };
      }),
    );

    try {
      await voteOnPoll(postId, optionId);
    } catch (error: any) {
      Alert.alert("Error", "Failed to cast vote on poll");
      fetchFeed(); // Refresh to ensure valid state
    }
  };

  const handleJoinLobbyAction = async (postId: string) => {
    setJoiningLobby(true);
    try {
      await joinLobby(postId);
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.lobby) return p;
          return {
            ...p,
            lobby: {
              ...p.lobby,
              currentJoined: p.lobby.currentJoined + 1,
              isJoined: true,
            },
          };
        }),
      );
      Alert.alert("Success", "You have joined the lobby!");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to join lobby.",
      );
    } finally {
      setJoiningLobby(false);
    }
  };

  const handleModeratePostMenu = (postId: string) => {
    Alert.alert(
      "Moderator Actions",
      "What would you like to do with this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Lock Post",
          onPress: () => handleModerateAction(postId, "LOCK"),
        },
        {
          text: "Remove Post",
          style: "destructive",
          onPress: () => handleModerateAction(postId, "REMOVE"),
        },
      ],
    );
  };

  const handleModerateAction = async (
    postId: string,
    action: "LOCK" | "REMOVE",
  ) => {
    try {
      await moderatePost(postId, action);
      if (action === "REMOVE") {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: "LOCKED" } : p)),
        );
      }
      Alert.alert("Success", `Post has been ${action.toLowerCase()}ed.`);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          `Failed to ${action.toLowerCase()} post`,
      );
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() =>
        router.push({
          pathname: `/communities/post/${item.id}` as any,
          params: { role: role || "" },
        })
      }
      className="bg-white p-4 mb-3 rounded-xl border border-gray-200 shadow-sm"
    >
      {/* 1. Post Header */}
      <View className="flex-row items-center mb-2">
        <View style={styles.avatar}>
          {item.author.profilePic ? (
            <Image
              source={{ uri: item.author.profilePic }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatarImage,
                {
                  backgroundColor: "#DBEAFE",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Text className="text-blue-700 font-bold text-lg">
                {item.author.name
                  ? item.author.name.charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
          )}
        </View>
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-gray-900 font-semibold">
              {item.author.name}
            </Text>
            {item.status === "LOCKED" && (
              <View className="flex-row items-center bg-gray-100 px-2 py-0.5 rounded-full">
                <Feather name="lock" size={10} color="#6B7280" />
                <Text className="text-[10px] text-gray-500 font-medium ml-1">
                  LOCKED
                </Text>
              </View>
            )}
          </View>
          <Text className="text-gray-400 text-xs">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* 2. Main Content */}
      <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
      {item.content && (
        <Text className="text-gray-600 mb-3">{item.content}</Text>
      )}

      {/* 3. Image Gallery (If attachments exist) */}
      {item.attachments && item.attachments.length > 0 && (
        <Image
          source={{ uri: item.attachments[0].fileURL }}
          className="w-full h-48 rounded-lg mb-3"
          resizeMode="cover"
        />
      )}

      {/* 4. THE MAGIC WIDGETS (Poll, LFG, or Marketplace) */}
      {item.type === "POLL" && item.poll && (
        <View className="bg-gray-50 border border-gray-200 p-3 rounded-lg mb-3">
          <Text className="text-gray-800 font-bold mb-3">📊 Poll</Text>
          {item.poll.options.map((option) => {
            const isSelected = item.poll!.userVotedOptionId === option.id;
            const totalVotes = item.poll!.options.reduce(
              (sum, opt) => sum + Number(opt.voteCount),
              0,
            );

            const percentage =
              totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => handlePollVote(item.id, option.id)}
                className={`flex-row items-center justify-between p-3 mb-2 rounded-lg border ${isSelected ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"}`}
              >
                {/* Visual Progress Bar (Background) */}
                <View
                  className={`absolute left-0 top-0 bottom-0 rounded-lg ${isSelected ? "bg-blue-100" : "bg-gray-100"}`}
                  style={{ width: `${percentage}%`, opacity: 0.5 }}
                />

                <Text
                  className={`font-medium z-10 ${isSelected ? "text-blue-800" : "text-gray-700"}`}
                >
                  {option.optionText}
                </Text>
                {totalVotes > 0 && (
                  <Text className="text-gray-500 text-xs font-semibold z-10">
                    {Math.round(percentage)}% ({option.voteCount})
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {item.type === "LFG" && item.lobby && (
        <View className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg mb-3 flex-row justify-between items-center">
          <View>
            <Text className="text-indigo-800 font-bold">
              🎮 Looking for Group
            </Text>
            <Text className="text-indigo-600 text-xs mt-0.5">
              {item.lobby.currentJoined || 0} / {item.lobby.maxCapacity} Joined
            </Text>
          </View>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${item.lobby.isJoined ? "bg-indigo-300 border border-indigo-400" : "bg-indigo-600"} ${item.lobby.currentJoined >= item.lobby.maxCapacity && !item.lobby.isJoined ? "opacity-50" : ""}`}
            onPress={() => handleJoinLobbyAction(item.id)}
            disabled={
              joiningLobby ||
              item.lobby.isJoined ||
              item.lobby.currentJoined >= item.lobby.maxCapacity
            }
          >
            <Text
              className={`font-medium text-sm ${item.lobby.isJoined ? "text-indigo-800" : "text-white"}`}
            >
              {item.lobby.isJoined ? "Joined" : "Join Lobby"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.type === "MARKETPLACE" && item.marketplaceItem && (
        <View className="bg-green-50 border border-green-100 p-3 rounded-lg mb-3 flex-row justify-between items-center">
          <View>
            <Text className="text-green-800 font-bold mb-1 line-clamp-1">
              {item.marketplaceItem.title}
            </Text>
            <Text className="text-green-600 text-xs font-medium bg-green-200 self-start px-2 py-0.5 rounded">
              {item.marketplaceItem.condition}
            </Text>
          </View>
          <Text className="text-green-700 font-bold text-lg">
            ₹{item.marketplaceItem.price}
          </Text>
        </View>
      )}

      {/* 5. Footer (Upvotes & Comments) */}
      <View className="flex-row items-center justify-between border-t border-gray-100 pt-3 mt-1">
        <View className="flex-row items-center">
          {/* Upvote segment */}
          <TouchableOpacity
            onPress={() => handleVote(item.id, "UP")}
            className={`flex-row items-center px-3 py-1.5 rounded-l-full border border-gray-200 border-r-0 ${item.userVote === "UP" ? "bg-red-50" : "bg-gray-50"}`}
          >
            <Feather
              name="arrow-up"
              size={item.userVote === "UP" ? 18 : 16}
              color={item.userVote === "UP" ? "#EF4444" : "#4B5563"}
            />
            <Text
              className={`font-medium ml-1 ${item.userVote === "UP" ? "text-red-500" : "text-gray-700"}`}
            >
              {item.upvotes}
            </Text>
          </TouchableOpacity>

          {/* Downvote segment */}
          <TouchableOpacity
            onPress={() => handleVote(item.id, "DOWN")}
            className={`flex-row items-center px-3 py-1.5 rounded-r-full border border-gray-200 border-l-0 ${item.userVote === "DOWN" ? "bg-indigo-50" : "bg-gray-50"}`}
          >
            <Feather
              name="arrow-down"
              size={item.userVote === "DOWN" ? 18 : 16}
              color={item.userVote === "DOWN" ? "#6366F1" : "#4B5563"}
            />
            <Text
              className={`font-medium ml-1 flex-row items-center ${item.userVote === "DOWN" ? "text-indigo-500" : "text-gray-700"}`}
            >
              {item.downvotes > 0 ? item.downvotes : ""}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center px-2 py-1.5 ml-3">
            <Feather name="message-circle" size={16} color="#6B7280" />
            <Text className="text-gray-500 ml-1">{item.comments}</Text>
          </View>
        </View>

        {/* Report logic */}
        <TouchableOpacity
          onPress={() => {
            if (!item.isReported) setReportingItem(item.id);
          }}
          disabled={item.isReported}
          className="flex-row items-center ml-auto"
        >
          <Ionicons
            name={item.isReported ? "flag" : "flag-outline"}
            size={item.isReported ? 18 : 16}
            color={item.isReported ? "#EF4444" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* Mod/Admin Options */}
        {(role === "ADMIN" || role === "MODERATOR") && (
          <TouchableOpacity
            onPress={() => handleModeratePostMenu(item.id)}
            className="flex-row items-center ml-3"
          >
            <Feather name="shield" size={16} color="#4B5563" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      edges={["top", "left", "right"]}
    >
      {/* Custom Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="flex-1 text-xl font-bold text-gray-900">h/{name}</Text>

        {/* New Post */}
        <TouchableOpacity
          onPress={() =>
            router.push(`/communities/create-post?communityId=${id}` as any)
          }
          className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center shadow-lg"
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 0 }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchFeed();
          }}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              It's quiet here. Be the first to post!
            </Text>
          }
        />
      )}

      {/* Report Modal */}
      <Modal visible={!!reportingItem} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white w-full rounded-2xl p-6 shadow-lg">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Report Post
            </Text>
            <Text className="text-gray-500 mb-4">
              Please provide a reason for reporting this content. Our moderators
              will review it shortly.
            </Text>

            <TextInput
              className="bg-gray-100 rounded-lg p-3 text-gray-800 mb-4 min-h-[100px]"
              placeholder="E.g., Spam, Harassment, Inappropriate content..."
              placeholderTextColor="gray"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              textAlignVertical="top"
            />

            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                className="px-4 py-2"
                onPress={() => {
                  setReportingItem(null);
                  setReportReason("");
                }}
                disabled={submittingReport}
              >
                <Text className="text-gray-500 font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`bg-red-500 px-6 py-2 rounded-full flex-row items-center ml-2 ${!reportReason.trim() || submittingReport ? "opacity-50" : ""}`}
                onPress={submitReport}
                disabled={!reportReason.trim() || submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-bold">Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
