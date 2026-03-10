import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
// @ts-ignore
import { RootState } from "@/src/store/store";
import {
  ComplaintMessage,
  getComplaintThread,
  postMessageToThread,
} from "@/src/services/complaints.service";

interface ChatModalProps {
  visible: boolean;
  complaintId: string;
  complaintTitle: string;
  staff: string;
  onClose: () => void;
}

export function ComplaintChatModal({
  visible,
  complaintId,
  complaintTitle,
  staff,
  onClose,
}: ChatModalProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const currentUserId = (user as any)?.id || (user as any)?.userId;

  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && complaintId) {
      fetchMessages();
    } else {
      setMessages([]);
      setInputMessage("");
    }
  }, [visible, complaintId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getComplaintThread(complaintId);
      setMessages(data);
      // Wait a tick for layout, then scroll to end
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: false }),
        100,
      );
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    try {
      setSending(true);
      const newMessage = await postMessageToThread(
        complaintId,
        inputMessage.trim(),
      );
      setMessages((prev) => [...prev, newMessage]);
      setInputMessage("");
      Keyboard.dismiss();
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: ComplaintMessage;
    index: number;
  }) => {
    const isMe = item.senderId === currentUserId;

    // Check if previous message was from same user within 5 minutes to cluster bubbles
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const isClustered =
      prevMsg &&
      prevMsg.senderId === item.senderId &&
      new Date(item.createdAt).getTime() -
        new Date(prevMsg.createdAt).getTime() <
        5 * 60000;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperRight : styles.messageWrapperLeft,
          isClustered && styles.messageWrapperClustered,
        ]}
      >
        {!isMe && !isClustered && (
          <Text style={styles.senderName}>
            {item.senderName}{" "}
            <Text style={styles.senderRole}>({item.senderRole})</Text>
          </Text>
        )}

        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleRight : styles.bubbleLeft,
            isClustered &&
              (isMe ? styles.bubbleRightClustered : styles.bubbleLeftClustered),
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe ? styles.messageTextRight : styles.messageTextLeft,
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.timeText,
              isMe ? styles.timeTextRight : styles.timeTextLeft,
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Chat with {staff}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {complaintTitle}
              </Text>
            </View>
          </View>

          {/* Chat Body */}
          <View style={styles.chatBody}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#4F46E5"
                style={{ marginTop: 40 }}
              />
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="message-circle" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No messages yet.</Text>
                <Text style={styles.emptySubtext}>
                  Send a message to start the conversation.
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onLayout={() =>
                  flatListRef.current?.scrollToEnd({ animated: false })
                }
              />
            )}
          </View>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="gray"
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputMessage.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Feather
                  name="send"
                  size={20}
                  color="white"
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  chatBody: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },

  // Message Bubbles
  messageWrapper: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  messageWrapperLeft: {
    alignSelf: "flex-start",
  },
  messageWrapperRight: {
    alignSelf: "flex-end",
  },
  messageWrapperClustered: {
    marginTop: -8, // reduce gap for clustered messages
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    marginLeft: 4,
  },
  senderRole: {
    fontWeight: "400",
    fontSize: 10,
    textTransform: "capitalize",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleLeft: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
  },
  bubbleLeftClustered: {
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: "#4F46E5",
    borderBottomRightRadius: 4,
  },
  bubbleRightClustered: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextLeft: {
    color: "#1E293B",
  },
  messageTextRight: {
    color: "white",
  },
  timeText: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  timeTextLeft: {
    color: "#94A3B8",
  },
  timeTextRight: {
    color: "#A5B4FC",
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "flex-end",
  },
  input: {
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
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
});
