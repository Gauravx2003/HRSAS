import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "@/src/services/api";
import * as ImagePicker from "expo-image-picker";
import { createPost } from "@/src/services/communities.service";

// Components
import CreateDiscussionPost from "@/components/communities/CreateDiscussionPost";
import CreateLfgPost from "@/components/communities/CreateLfgPost";
import CreatePollPost from "@/components/communities/CreatePollPost";

export default function CreatePostScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"DISCUSSION" | "LFG" | "POLL">("DISCUSSION");

  // LFG Specific State
  const [maxCapacity, setMaxCapacity] = useState("4");

  // POLL Specific State
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      if (result.assets.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newUris]);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a title.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { title, content, type };

      if (type === "LFG") {
        payload.lfgDetails = {
          maxCapacity: parseInt(maxCapacity, 10),
          eventTime: new Date().toISOString(),
        };
      } else if (type === "POLL") {
        const validOptions = pollOptions.filter((opt) => opt.trim() !== "");
        if (validOptions.length < 2) {
          Alert.alert("Required", "Please provide at least two poll options.");
          setLoading(false);
          return;
        }
        payload.optionsForPoll = validOptions;
      }

      // 1. Create Post
      const res = await createPost(communityId, payload);
      const newPost = res.post;

      // 2. Upload images
      if (images.length > 0) {
        const formData = new FormData();

        for (const uri of images) {
          const filename = uri.split("/").pop() || "image.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const ext = match ? match[1] : "jpg";
          const mimeType =
            ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

          formData.append("images", {
            uri: uri,
            name: filename,
            type: mimeType,
          } as unknown as Blob);
        }

        await api.post(`/communities/${newPost.id}/attachments`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      Alert.alert("Success", "Post created!");
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || error.message || "Failed to post",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={styles.iconBtn}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Exact same Tab structure as complaints.tsx */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, type === "DISCUSSION" && styles.tabActive]}
            onPress={() => setType("DISCUSSION")}
          >
            <Text
              style={
                type === "DISCUSSION"
                  ? styles.tabTextActive
                  : styles.tabTextInactive
              }
            >
              Discussion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, type === "LFG" && styles.tabActive]}
            onPress={() => setType("LFG")}
          >
            <Text
              style={
                type === "LFG" ? styles.tabTextActive : styles.tabTextInactive
              }
            >
              LFG
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, type === "POLL" && styles.tabActive]}
            onPress={() => setType("POLL")}
          >
            <Text
              style={
                type === "POLL" ? styles.tabTextActive : styles.tabTextInactive
              }
            >
              Poll
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Inputs */}
        {type === "DISCUSSION" && (
          <CreateDiscussionPost
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
          />
        )}

        {type === "LFG" && (
          <CreateLfgPost
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
            maxCapacity={maxCapacity}
            setMaxCapacity={setMaxCapacity}
          />
        )}

        {type === "POLL" && (
          <CreatePollPost
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
            options={pollOptions}
            setOptions={setPollOptions}
          />
        )}

        {/* Image Attachment Button */}
        <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
          <Feather name="image" size={20} color="#6B7280" />
          <Text style={styles.attachText}>Attach Image</Text>
        </TouchableOpacity>

        {/* Selected Images Preview */}
        {images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
          >
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={styles.removeImageBtn}
                >
                  <Feather name="x" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  iconBtn: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  postBtnText: {
    color: "#2563EB",
    fontWeight: "bold",
    fontSize: 16,
  },
  inner: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabTextActive: {
    fontWeight: "600",
    color: "#111827",
  },
  tabTextInactive: {
    fontWeight: "600",
    color: "#6B7280",
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    marginTop: 16,
    marginBottom: 40, // Extra padding for scrolling
  },
  attachText: {
    color: "#6B7280",
    fontWeight: "500",
    marginLeft: 8,
  },
  imageScroll: {
    marginTop: 16,
    paddingBottom: 20,
  },
  imageWrapper: {
    marginRight: 12,
    position: "relative",
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  removeImageBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
