import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { reportContent } from "@/src/services/communities.service";
import {
  Post,
  Comment,
  getPostById,
  getCommentsByPostId,
  postComments,
  voteContent,
  moderatePost,
  moderateComment,
  voteOnPoll,
  joinLobby,
} from "@/src/services/communities.service";

export default function PostThreadScreen() {
  const { postId, role } = useLocalSearchParams<{
    postId: string;
    role?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [post, setPost] = useState<Post | null>(null);

  // Join Lobby Action State
  const [joiningLobby, setJoiningLobby] = useState(false);

  // Reporting State
  const [reportingItem, setReportingItem] = useState<{
    id: string;
    type: "POST" | "COMMENT";
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchPostDetails = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        getPostById(postId),
        getCommentsByPostId(postId),
      ]);

      setPost(postRes);

      // Build comment tree
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      commentsRes.forEach((comment: Comment) => {
        comment.replies = [];
        commentsMap.set(comment.id, comment);
      });

      commentsRes.forEach((comment: Comment) => {
        if (comment.parentCommentId) {
          const parent = commentsMap.get(comment.parentCommentId);
          if (parent) {
            parent.replies!.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error: any) {
      console.log(error);
      Alert.alert("Error", "Failed to load post details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await postComments(postId, newComment, replyingTo?.id || null);
      setNewComment("");
      setReplyingTo(null);
      fetchPostDetails(); // Refresh list to show new comment
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to post comment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportingItem || !reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      await reportContent(
        reportingItem.type,
        reportingItem.id,
        reportReason.trim(),
      );

      // Optimistically update the "isReported" flag
      if (reportingItem.type === "POST" && post) {
        setPost({ ...post, isReported: true });
      } else if (reportingItem.type === "COMMENT") {
        setComments((prev) =>
          recursiveModifyComment(prev, reportingItem.id, (c) => ({
            ...c,
            isReported: true,
          })),
        );
      }

      Alert.alert(
        "Success",
        "Report submitted. Thank you for keeping the community safe.",
      );
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

  const handleModeratePostMenu = () => {
    Alert.alert(
      "Moderator Actions",
      "What would you like to do with this post?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Lock Post", onPress: () => handleModeratePostAction("LOCK") },
        {
          text: "Remove Post",
          style: "destructive",
          onPress: () => handleModeratePostAction("REMOVE"),
        },
      ],
    );
  };

  const handleModeratePostAction = async (action: "LOCK" | "REMOVE") => {
    try {
      await moderatePost(postId, action);
      if (action === "REMOVE") {
        Alert.alert("Success", "Post removed.");
        router.back();
      } else {
        if (post) setPost({ ...post, status: "LOCKED" });
        Alert.alert("Success", "Post locked.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    }
  };

  const handleModerateComment = (commentId: string) => {
    Alert.alert(
      "Remove Comment",
      "Are you sure you want to remove this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => execModerateComment(commentId),
        },
      ],
    );
  };

  const execModerateComment = async (commentId: string) => {
    try {
      await moderateComment(commentId);
      setComments((prev) =>
        recursiveModifyComment(prev, commentId, (c) => ({
          ...c,
          isRemoved: true,
          content: "[Removed by Moderator]",
        })),
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to remove comment",
      );
    }
  };

  const handlePostVote = async (voteType: "UP" | "DOWN") => {
    if (!post) return;
    const previousPost = { ...post };

    let newUpvotes = post.upvotes;
    let newDownvotes = post.downvotes || 0;
    let newUserVote = post.userVote;

    if (post.userVote === voteType) {
      if (voteType === "UP") newUpvotes--;
      else newDownvotes--;
      newUserVote = null;
    } else {
      if (post.userVote === "UP") newUpvotes--;
      if (post.userVote === "DOWN") newDownvotes--;

      if (voteType === "UP") newUpvotes++;
      else newDownvotes++;
      newUserVote = voteType;
    }

    setPost({
      ...post,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      userVote: newUserVote as any,
    });

    try {
      await voteContent("POST", post.id, voteType);
    } catch {
      setPost(previousPost);
      Alert.alert("Error", "Failed to register vote");
    }
  };

  const recursiveModifyComment = (
    nodes: Comment[],
    targetId: string,
    modifier: (c: Comment) => Comment,
  ): Comment[] => {
    return nodes.map((node) => {
      if (node.id === targetId) return modifier(node);
      if (node.replies && node.replies.length > 0) {
        return {
          ...node,
          replies: recursiveModifyComment(node.replies, targetId, modifier),
        };
      }
      return node;
    });
  };

  const handleCommentVote = async (
    commentId: string,
    voteType: "UP" | "DOWN",
  ) => {
    const previousComments = [...comments];

    setComments((prev) =>
      recursiveModifyComment(prev, commentId, (c) => {
        let newUpvotes = c.upvotes || 0;
        let newDownvotes = c.downvotes || 0;
        let newUserVote = c.userVote;

        if (c.userVote === voteType) {
          if (voteType === "UP") newUpvotes--;
          else newDownvotes--;
          newUserVote = null;
        } else {
          if (c.userVote === "UP") newUpvotes--;
          if (c.userVote === "DOWN") newDownvotes--;

          if (voteType === "UP") newUpvotes++;
          else newDownvotes++;
          newUserVote = voteType;
        }

        return {
          ...c,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote as any,
        };
      }),
    );

    try {
      await voteContent("COMMENT", commentId, voteType);
    } catch {
      setComments(previousComments);
      Alert.alert("Error", "Failed to register vote");
    }
  };

  const handleJoinLobbyAction = async () => {
    if (!post || !post.lobby) return;
    setJoiningLobby(true);
    try {
      await joinLobby(postId);
      
      // Optimistic update
      setPost({
        ...post,
        lobby: {
          ...post.lobby,
          currentJoined: post.lobby.currentJoined + 1,
          isJoined: true,
        },
      });
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

  const handlePollVote = async (optionId: string) => {
    if (!post || !post.poll) return;

    const previousPost = { ...post };
    const currentVotedId = post.poll.userVotedOptionId;
    if (currentVotedId === optionId) return;

    const newOptions = post.poll.options.map((opt) => {
      let updatedVoteCount = opt.voteCount;
      if (opt.id === currentVotedId) updatedVoteCount--;
      if (opt.id === optionId) updatedVoteCount++;
      return { ...opt, voteCount: Math.max(0, updatedVoteCount) };
    });

    setPost({
      ...post,
      poll: {
        ...post.poll,
        options: newOptions,
        userVotedOptionId: optionId,
      },
    });

    try {
      await voteOnPoll(postId, optionId);
    } catch {
      setPost(previousPost);
      Alert.alert("Error", "Failed to cast vote on poll");
    }
  };

  const CommentNode = ({
    comment,
    depth = 0,
  }: {
    comment: Comment;
    depth?: number;
  }) => {
    return (
      <View>
        <View className="flex-row mt-3">
          {/* Avatar Area */}
          <View className="items-center mr-3">
            <View style={styles.commentAvatar}>
              {comment.author.profilePic ? (
                <Image
                  source={{ uri: comment.author.profilePic }}
                  style={styles.commentAvatarImage}
                />
              ) : (
                <View
                  style={[
                    styles.commentAvatarImage,
                    {
                      backgroundColor: "#DBEAFE",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text className="text-blue-700 font-bold text-sm">
                    {comment.author.name
                      ? comment.author.name.charAt(0).toUpperCase()
                      : "?"}
                  </Text>
                </View>
              )}
            </View>
            {/* Thread line if there are replies */}
            {comment.replies && comment.replies.length > 0 && (
              <View className="w-[1.5px] bg-gray-200 flex-1 mt-2 mb-1 rounded-full" />
            )}
          </View>

          {/* Comment Content */}
          <View className="flex-1">
            <View className="bg-white p-3 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm">
              <View className="flex-row items-center mb-1">
                <Text className="font-semibold text-gray-900 mr-2 text-sm">
                  {comment.author.name}
                </Text>
                <Text className="text-[10px] text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text className="text-gray-700 text-[15px] leading-5">
                {comment.content}
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row items-center mt-1 ml-1 mb-2">
              <TouchableOpacity
                className="flex-row items-center px-2 py-1"
                onPress={() =>
                  setReplyingTo({ id: comment.id, name: comment.author.name })
                }
              >
                <Feather name="corner-down-right" size={14} color="#6B7280" />
                <Text className="text-xs font-semibold text-gray-500 ml-1">
                  Reply
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center border border-gray-200 rounded-full bg-gray-50 ml-2">
                <TouchableOpacity
                  className={`px-2 py-1 flex-row items-center rounded-l-full ${comment.userVote === "UP" ? "bg-red-50" : ""}`}
                  onPress={() => handleCommentVote(comment.id, "UP")}
                >
                  <Feather
                    name="arrow-up"
                    size={14}
                    color={comment.userVote === "UP" ? "#EF4444" : "#6B7280"}
                  />
                  <Text
                    className={`text-xs ml-1 ${comment.userVote === "UP" ? "text-red-500 font-bold" : "text-gray-500 font-medium"}`}
                  >
                    {comment.upvotes || 0}
                  </Text>
                </TouchableOpacity>
                <View className="w-[1px] h-4 bg-gray-200" />
                <TouchableOpacity
                  className={`px-2 py-1 flex-row items-center rounded-r-full ${comment.userVote === "DOWN" ? "bg-indigo-50" : ""}`}
                  onPress={() => handleCommentVote(comment.id, "DOWN")}
                >
                  <Feather
                    name="arrow-down"
                    size={14}
                    color={comment.userVote === "DOWN" ? "#6366F1" : "#6B7280"}
                  />
                  <Text
                    className={`text-xs ml-1 ${comment.userVote === "DOWN" ? "text-indigo-500 font-bold" : "text-gray-500 font-medium"}`}
                  >
                    {comment.downvotes > 0 ? comment.downvotes : ""}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="flex-row items-center px-2 py-1 ml-2"
                onPress={() => {
                  if (!comment.isReported)
                    setReportingItem({ id: comment.id, type: "COMMENT" });
                }}
                disabled={comment.isReported}
              >
                <Ionicons
                  name={comment.isReported ? "flag" : "flag-outline"}
                  size={14}
                  color={comment.isReported ? "#EF4444" : "#9CA3AF"}
                />
                <Text
                  className={`text-xs font-semibold ml-1 ${comment.isReported ? "text-red-500" : "text-gray-400"}`}
                >
                  {comment.isReported ? "Reported" : "Report"}
                </Text>
              </TouchableOpacity>

              {/* Mod/Admin Remove Option */}
              {(role === "ADMIN" || role === "MODERATOR") &&
                !comment.isRemoved && (
                  <TouchableOpacity
                    className="flex-row items-center px-2 py-1 ml-2"
                    onPress={() => handleModerateComment(comment.id)}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                    <Text className="text-xs font-semibold ml-1 text-red-500">
                      Remove
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        </View>

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View className="ml-5 border-l border-gray-100 pl-2">
            {comment.replies.map((reply) => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => {
    return <CommentNode comment={item} />;
  };

  const renderPostHeader = () => {
    if (!post) return null;

    return (
      <View className="bg-white p-4 mb-4 rounded-xl border border-gray-200 shadow-sm">
        <View className="flex-row items-center mb-3">
          <View
            style={{
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
            }}
          >
            {post.author.profilePic ? (
              <Image
                source={{ uri: post.author.profilePic }}
                style={{ width: "100%", height: "100%", borderRadius: 20 }}
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 20,
                  backgroundColor: "#DBEAFE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text className="text-blue-700 font-bold text-lg">
                  {post.author.name
                    ? post.author.name.charAt(0).toUpperCase()
                    : "?"}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text className="text-gray-900 font-semibold text-base">
              {post.author.name}
            </Text>
            <Text className="text-gray-400 text-xs">
              {new Date(post.createdAt).toLocaleDateString()} •{" "}
              {post.type.replace("_", " ")}
            </Text>
          </View>
        </View>

        <Text className="text-xl font-bold text-gray-900 mb-2 leading-tight">
          {post.title}
        </Text>

        {post.content && (
          <Text className="text-gray-700 text-base mb-4 leading-relaxed">
            {post.content}
          </Text>
        )}

        {/* Dynamic Widgets */}
        {post.type === "POLL" && post.poll && (
          <View className="bg-gray-50 border border-gray-200 p-3 rounded-lg mb-4">
            <Text className="text-gray-800 font-bold mb-3">📊 Poll</Text>
            {post.poll.options.map((option) => {
              const isSelected = post.poll!.userVotedOptionId === option.id;
              const totalVotes = post.poll!.options.reduce(
                (sum, opt) => sum + opt.voteCount,
                0,
              );
              const percentage =
                totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;

              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handlePollVote(option.id)}
                  className={`flex-row items-center justify-between p-3 mb-2 rounded-lg border ${isSelected ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"}`}
                >
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

        {post.type === "LFG" && post.lobby && (
          <View className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg mb-4">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-indigo-800 font-bold">
                  🎮 Looking for Group
                </Text>
                <Text className="text-indigo-600 text-xs mt-0.5">
                  {post.lobby.currentJoined || 0} / {post.lobby.maxCapacity}{" "}
                  Joined
                </Text>
              </View>
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${post.lobby.isJoined ? "bg-indigo-300 border border-indigo-400" : "bg-indigo-600"} ${post.lobby.currentJoined >= post.lobby.maxCapacity && !post.lobby.isJoined ? "opacity-50" : ""}`}
                onPress={handleJoinLobbyAction}
                disabled={
                  joiningLobby ||
                  post.lobby.isJoined ||
                  post.lobby.currentJoined >= post.lobby.maxCapacity
                }
              >
                <Text
                  className={`font-medium text-sm ${post.lobby.isJoined ? "text-indigo-800" : "text-white"}`}
                >
                  {post.lobby.isJoined ? "Joined" : "Join Lobby"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Render Participants for Author */}
            {post.lobby.participants && post.lobby.participants.length > 0 && (
              <View className="mt-4 pt-3 border-t border-indigo-200">
                <Text className="text-indigo-800 font-bold text-xs mb-2">
                  Lobby Participants (Visible only to you)
                </Text>
                {post.lobby.participants.map((participant) => (
                  <View key={participant.id} className="flex-row items-center mb-2">
                    <View className="h-6 w-6 rounded-full bg-indigo-200 mr-2 items-center justify-center overflow-hidden">
                      {participant.profilePic ? (
                        <Image
                          source={{ uri: participant.profilePic }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <Text className="text-indigo-700 text-[10px] font-bold">
                          {participant.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text className="text-indigo-900 text-sm font-medium">
                      {participant.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Upvotes / Actions Row */}
        <View className="flex-row items-center border-t border-gray-100 pt-3 mt-2 flex-wrap gap-y-2">
          {/* Custom segmented upvote/downvote */}
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-full mr-3">
            <TouchableOpacity
              onPress={() => handlePostVote("UP")}
              className={`flex-row items-center px-3 py-1.5 rounded-l-full ${post.userVote === "UP" ? "bg-red-50" : ""}`}
            >
              <Feather
                name="arrow-up"
                size={post.userVote === "UP" ? 18 : 16}
                color={post.userVote === "UP" ? "#EF4444" : "#4B5563"}
              />
              <Text
                className={`font-bold ml-1 ${post.userVote === "UP" ? "text-red-500" : "text-gray-700"}`}
              >
                {post.upvotes}
              </Text>
            </TouchableOpacity>

            <View className="w-[1px] h-5 bg-gray-200" />

            <TouchableOpacity
              onPress={() => handlePostVote("DOWN")}
              className={`flex-row items-center px-3 py-1.5 rounded-r-full ${post.userVote === "DOWN" ? "bg-indigo-50" : ""}`}
            >
              <Feather
                name="arrow-down"
                size={post.userVote === "DOWN" ? 18 : 16}
                color={post.userVote === "DOWN" ? "#6366F1" : "#4B5563"}
              />
              <Text
                className={`font-bold ml-1 ${post.userVote === "DOWN" ? "text-indigo-500" : "text-gray-700"}`}
              >
                {post.downvotes > 0 ? post.downvotes : ""}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full mr-3">
            <Feather name="share-2" size={16} color="#4B5563" />
            <Text className="text-gray-700 font-medium ml-1">Share</Text>
          </View>

          {/* Report Flag */}
          <TouchableOpacity
            className={`flex-row items-center px-3 py-1.5 rounded-full ml-auto ${post.isReported ? "bg-red-50 border border-red-200" : "bg-transparent"}`}
            onPress={() => {
              if (!post.isReported)
                setReportingItem({ id: post.id, type: "POST" });
            }}
            disabled={post.isReported}
          >
            <Ionicons
              name={post.isReported ? "flag" : "flag-outline"}
              size={16}
              color={post.isReported ? "#EF4444" : "#9CA3AF"}
            />
          </TouchableOpacity>

          {/* Mod/Admin Options */}
          {(role === "ADMIN" || role === "MODERATOR") && (
            <TouchableOpacity
              onPress={handleModeratePostMenu}
              className="flex-row items-center px-3 py-1.5 rounded-full ml-2 border bg-gray-50 border-gray-200"
            >
              <Feather name="shield" size={16} color="#4B5563" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F3F4F6", paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Post Thread</Text>
      </View>

      {/* Comment List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={renderPostHeader}
          contentContainerStyle={{ padding: 0, paddingBottom: 20 }}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10 p-4 bg-white rounded-lg border border-gray-100">
              No comments yet. Be the first to share your thoughts!
            </Text>
          }
        />
      )}

      {/* Input Field (Pinned to bottom) */}
      {post?.status !== "LOCKED" ? (
        <View className="bg-white border-t border-gray-200 px-4 py-3 pb-6">
          {replyingTo && (
            <View className="flex-row items-center justify-between bg-blue-50 p-2 rounded mb-2">
              <Text className="text-blue-700 text-xs font-medium">
                Replying to {replyingTo.name}...
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Feather name="x" size={16} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 bg-gray-100 px-4 py-2.5 rounded-full text-gray-800"
              placeholder="Add a comment..."
              placeholderTextColor="gray"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={submitting || !newComment.trim()}
              className={`ml-3 bg-blue-600 w-10 h-10 rounded-full items-center justify-center ${!newComment.trim() || submitting ? "opacity-50" : ""}`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center justify-center gap-2 bg-white border-t border-gray-200 px-4 py-3 pb-6">
          <Feather name="lock" size={15} color="#111827" />
          <Text className="text-center text-gray-500">
            Comments Disabled By Admin
          </Text>
        </View>
      )}

      {/* Report Modal */}
      <Modal visible={!!reportingItem} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white w-full rounded-2xl p-6 shadow-lg">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Report {reportingItem?.type === "POST" ? "Post" : "Comment"}
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
                onPress={handleReport}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  commentAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  commentAvatar: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
