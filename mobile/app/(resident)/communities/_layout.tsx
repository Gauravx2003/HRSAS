import { Stack } from "expo-router";

export default function CommunitiesLayout() {
  return (
    // headerShown: false prevents double headers since you built custom ones
    <Stack screenOptions={{ headerShown: false }}>
      {/* The Hub */}
      <Stack.Screen name="index" />

      {/* The Feed */}
      <Stack.Screen name="[id]" />

      {/* Create Post */}
      <Stack.Screen name="create-post" />

      {/* The Thread / Comments */}
      <Stack.Screen name="post/[postId]" />
    </Stack>
  );
}
