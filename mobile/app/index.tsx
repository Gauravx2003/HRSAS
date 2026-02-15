import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setCredentials } from "../src/store/authSlice";
import { Feather } from "@expo/vector-icons";

// LAPTOP'S LOCAL IP ADDRESS
// e.g., http://192.168.1.5:5000/api
const API_URL = "http://192.168.31.29:5000/api";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { user, token } = response.data;

      // 1. Save to Redux
      dispatch(setCredentials({ user, token }));

      //2. Redirect based on Role
      if (user.role === "RESIDENT") {
        router.replace("/(resident)/dashboard");
      } else if (user.role === "SECURITY") {
        router.replace("/(security)/dashboard");
      } else if (user.role === "STAFF") {
        router.replace("/(staff)/dashboard");
      } else {
        Alert.alert("Access Denied", "Admins must use the Web Portal.");
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-center px-6">
      <StatusBar style="dark" />

      {/* Header Section */}
      <View className="items-center mb-10">
        <View className="h-20 w-20 bg-blue-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
          {/* You can replace this Text with an <Image /> later */}
          <Text className="text-white text-3xl font-bold">H</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-900">Welcome Back!</Text>
        <Text className="text-gray-500 mt-2 text-center">
          Sign in to access your digital hl dashboard
        </Text>
      </View>

      {/* Form Section */}
      <View className="space-y-4">
        {/* Email Input */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
          <Feather name="mail" size={20} color="#6B7280" />
          <TextInput
            placeholder="Email Address"
            className="flex-1 ml-3 text-gray-800 text-base"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password Input */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
          <Feather name="lock" size={20} color="#6B7280" />
          <TextInput
            placeholder="Password"
            className="flex-1 ml-3 text-gray-800 text-base"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <Feather name="eye-off" size={20} color="#6B7280" />
            ) : (
              <Feather name="eye" size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() =>
            Alert.alert("Reset Password", "Contact Admin to reset credentials.")
          }
        >
          <Text className="text-blue-600 text-right font-medium mt-1">
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className={`bg-blue-600 py-4 rounded-xl shadow-md mt-4 ${loading ? "opacity-70" : ""}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="mt-10 items-center">
        <Text className="text-gray-400 text-xs">Habitat Hoste</Text>
      </View>
    </SafeAreaView>
  );
}
