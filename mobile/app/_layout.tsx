import "../global.css";
import { Stack } from "expo-router";
import { Provider, useDispatch } from "react-redux";
import { store } from "../src/store/store";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { setCredentials } from "../src/store/authSlice";
import { ActivityIndicator, View } from "react-native";

// Keep the splash screen visible while we fetch fonts and auth tokens
SplashScreen.preventAutoHideAsync();

// 1. Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── THE INNER COMPONENT (Safely inside the Redux Provider) ───
function InnerLayout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    SNProMedium: require("../assets/fonts/SNProMedium.ttf"),
    SNProBold: require("../assets/fonts/SNProBold.ttf"),
    SNProBlack: require("../assets/fonts/SNProBlack.ttf"),
    SNProRegular: require("../assets/fonts/SNProRegular.ttf"),
    SNProExtraBold: require("../assets/fonts/SNProExtraBold.ttf"),
  });

  // Handle Push Notification Taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.route) {
          console.log("🚀 Redirecting to:", data.route);
          router.push({
            pathname: data.route as any,
            params: data.params as any,
          });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Handle Auth Persistence Bootstrapping
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedRefreshToken =
          await SecureStore.getItemAsync("refreshToken");
        const storedAccessToken = await SecureStore.getItemAsync("accessToken");
        const storedUser = await SecureStore.getItemAsync("user");

        if (storedRefreshToken && storedAccessToken && storedUser) {
          dispatch(
            setCredentials({
              user: JSON.parse(storedUser),
              token: storedAccessToken,
              refreshToken: storedRefreshToken,
            }),
          );
        }
      } catch (e) {
        console.error("Failed to restore auth state", e);
      } finally {
        setIsReady(true);
      }
    };

    bootstrapAuth();
  }, [dispatch]);

  // Hide Splash Screen ONLY when both fonts are loaded and auth is checked
  useEffect(() => {
    if (fontsLoaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady]);

  // While waiting, show a centered spinner
  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // The actual App Navigation
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(resident)" options={{ headerShown: false }} />
        <Stack.Screen name="(security)" options={{ headerShown: false }} />
        <Stack.Screen name="(staff)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

// ─── THE OUTER COMPONENT (Provides the Redux Store) ───
export default function RootLayout() {
  return (
    <Provider store={store}>
      <InnerLayout />
    </Provider>
  );
}
