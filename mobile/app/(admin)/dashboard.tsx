import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "../../src/store/store";

export default function Dashboard() {
  const router = useRouter();
  // Get user from Redux (if null, default to "Student")
  const user = useSelector((state: RootState) => state.auth.user);
  const userName = user?.name || "Student";

  return (
    <View>
      <Text>Dashboard</Text>
      <Text>Welcome, {userName}!</Text>
    </View>
  );
}
