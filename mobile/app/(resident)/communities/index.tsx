import React, { useState, useCallback } from "react";
import { Href } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { api } from "@/src/services/api"; // Your Axios interceptor file

// Define the TypeScript interface based on your backend response
interface Community {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  isJoined: boolean;
  role: string | null;
}

export default function CommunityHubScreen() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchCommunities = async () => {
    try {
      const response = await api.get("/communities");
      setCommunities(response.data);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect ensures the list refreshes every time the user navigates back to this tab
  useFocusEffect(
    useCallback(() => {
      fetchCommunities();
    }, []),
  );

  const handleJoin = async (communityId: string, isPrivate: boolean) => {
    if (isPrivate) {
      Alert.alert("Private Club", "This club requires admin approval to join.");
      return;
    }

    setJoiningId(communityId);
    try {
      await api.post(`/communities/${communityId}/join`);
      // Instantly update the UI so the user doesn't have to wait for a full refresh
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId
            ? { ...c, isJoined: true, memberCount: c.memberCount + 1 }
            : c,
        ),
      );
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to join");
    } finally {
      setJoiningId(null);
    }
  };

  const navigateToFeed = (communityId: string, communityName: string, role: string | null) => {
    // We pass the name in the URL so the next screen can put "h/music" in the header instantly
    router.push({
      pathname: "/(resident)/communities/[id]" as any,
      params: { id: communityId, name: communityName, role: role || "" },
    });
  };

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        item.isJoined ? navigateToFeed(item.id, item.name, item.role) : null
      }
      className="bg-white p-4 mb-3 rounded-2xl border border-gray-200 shadow-sm flex-row items-center justify-between"
    >
      <View className="flex-1 mr-4">
        <View className="flex-row items-center mb-1">
          <Text className="text-lg font-bold text-gray-900">h/{item.name}</Text>
          {item.isPrivate && (
            <Feather
              name="lock"
              size={14}
              color="#9CA3AF"
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
        <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>
          {item.description}
        </Text>
        <View className="flex-row items-center">
          <Feather name="users" size={14} color="#6B7280" />
          <Text className="text-gray-500 text-xs ml-1">
            {item.memberCount} members
          </Text>
        </View>
      </View>

      {/* Action Button: Either "View" or "Join" */}
      {item.isJoined ? (
        <TouchableOpacity
          onPress={() => navigateToFeed(item.id, item.name, item.role)}
          className="bg-gray-100 px-4 py-2 rounded-full"
        >
          <Text className="text-gray-700 font-medium">View</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => handleJoin(item.id, item.isPrivate)}
          disabled={joiningId === item.id}
          className="bg-blue-600 px-4 py-2 rounded-full"
        >
          {joiningId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-medium">Join</Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 pt-4">
      <View className="flex-row items-center justify-between mb-6 px-4">
        <Text className="text-3xl font-bold text-gray-900">Communities</Text>
        <TouchableOpacity className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
          <Feather name="search" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={communities}
        keyExtractor={(item) => item.id}
        renderItem={renderCommunityCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-10">
            No communities available in your hostel yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
