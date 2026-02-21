import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import {
  raiseComplaint,
  uploadComplaintAttachments,
  ComplaintCategory,
} from "@/src/services/complaints.service";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

interface Props {
  categories: ComplaintCategory[];
  roomId?: string;
  /** Called after a successful submission so the parent can switch tabs & refresh */
  onSubmitSuccess: () => void;
}

export function ComplaintForm({ categories, roomId, onSubmitSuccess }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const pickImages = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert("Limit", "You can attach up to 5 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedImages.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setSelectedImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title || !desc || !selectedCategory) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    if (!roomId) {
      Alert.alert("Error", "Room ID not found. Please contact admin.");
      return;
    }

    try {
      setSubmitting(true);
      const newComplaint = await raiseComplaint({
        categoryId: selectedCategory,
        title,
        description: desc,
        roomId,
      });

      if (selectedImages.length > 0 && newComplaint?.id) {
        try {
          await uploadComplaintAttachments(newComplaint.id, selectedImages);
        } catch (uploadErr) {
          console.error("Failed to upload attachments:", uploadErr);
        }
      }

      Alert.alert("Success", "Complaint raised successfully!");
      setTitle("");
      setDesc("");
      setSelectedCategory("");
      setSelectedImages([]);
      onSubmitSuccess();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to raise complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.formContainer}>
          <Text className="font-sn-pro-bold" style={styles.label}>
            Issue Category
          </Text>
          <View style={styles.chipContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.chip,
                  selectedCategory === cat.id
                    ? styles.chipActive
                    : styles.chipInactive,
                ]}
              >
                <Text
                  className="font-sn-pro-medium"
                  style={
                    selectedCategory === cat.id
                      ? styles.chipTextActive
                      : styles.chipTextInactive
                  }
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="font-sn-pro-bold" style={styles.label}>
            Subject
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fan not working"
            value={title}
            onChangeText={setTitle}
          />

          <Text className="font-sn-pro-bold" style={styles.label}>
            Description
          </Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder="Describe details..."
            multiline
            value={desc}
            onChangeText={setDesc}
          />

          <Text className="font-sn-pro-bold" style={styles.label}>
            Attach Photos (optional)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerRow}
          >
            {selectedImages.map((uri, idx) => (
              <View key={idx} style={styles.pickerThumbWrap}>
                <Image source={{ uri }} style={styles.pickerThumb} />
                <TouchableOpacity
                  style={styles.pickerRemoveBtn}
                  onPress={() => removeImage(idx)}
                >
                  <Feather name="x" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedImages.length < 5 && (
              <TouchableOpacity
                style={styles.pickerAddBtn}
                onPress={pickImages}
              >
                <Feather name="camera" size={22} color="#94A3B8" />
                <Text style={styles.pickerAddText}>
                  {selectedImages.length === 0
                    ? "Add"
                    : `${selectedImages.length}/5`}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-sn-pro-bold" style={styles.submitBtnText}>
                Submit Complaint
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 40,
  },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "white", fontSize: 16 },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipInactive: { backgroundColor: "white", borderColor: "#E5E7EB" },
  chipTextActive: { color: "white", fontWeight: "500" },
  chipTextInactive: { color: "#4B5563", fontWeight: "500" },
  pickerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    paddingBottom: 4,
    marginBottom: 16,
  },
  pickerThumbWrap: {
    position: "relative",
  },
  pickerThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  pickerRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerAddBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pickerAddText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
