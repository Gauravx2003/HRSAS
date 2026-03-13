import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

interface CreatePollPostProps {
  title: string;
  setTitle: (text: string) => void;
  content: string;
  setContent: (text: string) => void;
  options: string[];
  setOptions: (options: string[]) => void;
}

export default function CreatePollPost({
  title,
  setTitle,
  content,
  setContent,
  options,
  setOptions,
}: CreatePollPostProps) {
  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Poll Question..."
        className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        placeholder="Additional details (optional)..."
        className="text-base text-gray-800 min-h-[80px]"
        multiline
        textAlignVertical="top"
        value={content}
        onChangeText={setContent}
        placeholderTextColor="#9CA3AF"
      />

      <View className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <Text className="text-gray-800 font-bold mb-3">Poll Options</Text>

        {options.map((option, index) => (
          <View key={index} className="flex-row items-center mb-3">
            <TextInput
              placeholder={`Option ${index + 1}`}
              className="flex-1 bg-white px-4 py-2 rounded-lg border border-gray-200 text-gray-800"
              value={option}
              onChangeText={(text) => handleOptionChange(text, index)}
              placeholderTextColor="#9CA3AF"
            />
            {options.length > 2 && (
              <TouchableOpacity
                onPress={() => handleRemoveOption(index)}
                className="ml-2 p-2"
              >
                <Feather name="x" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {options.length < 6 && (
          <TouchableOpacity
            onPress={handleAddOption}
            className="flex-row items-center mt-2"
          >
            <Feather name="plus" size={18} color="#2563EB" />
            <Text className="text-blue-600 font-medium ml-1">Add Option</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
