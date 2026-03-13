import React from "react";
import { View, Text, TextInput } from "react-native";

interface CreateLfgPostProps {
  title: string;
  setTitle: (text: string) => void;
  content: string;
  setContent: (text: string) => void;
  maxCapacity: string;
  setMaxCapacity: (text: string) => void;
}

export default function CreateLfgPost({
  title,
  setTitle,
  content,
  setContent,
  maxCapacity,
  setMaxCapacity,
}: CreateLfgPostProps) {
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

      <View className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <Text className="text-indigo-800 font-bold mb-2">Lobby Settings</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-indigo-900">Players Needed:</Text>
          <TextInput
            className="bg-white px-3 py-1 rounded border border-indigo-200 w-16 text-center"
            keyboardType="numeric"
            value={maxCapacity}
            onChangeText={setMaxCapacity}
          />
        </View>
      </View>
    </View>
  );
}
