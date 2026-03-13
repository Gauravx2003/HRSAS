import React from "react";
import { View, TextInput } from "react-native";

interface CreateDiscussionPostProps {
  title: string;
  setTitle: (text: string) => void;
  content: string;
  setContent: (text: string) => void;
}

export default function CreateDiscussionPost({
  title,
  setTitle,
  content,
  setContent,
}: CreateDiscussionPostProps) {
  return (
    <View>
      <TextInput
        placeholder="An interesting title..."
        className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        placeholder="What are your thoughts?"
        className="text-base text-gray-800 min-h-[150px]"
        multiline
        textAlignVertical="top"
        value={content}
        onChangeText={setContent}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}
