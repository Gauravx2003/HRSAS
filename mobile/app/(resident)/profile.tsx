import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getProfile, Profile } from "@/src/services/profile.service";
import { ProfileFooter } from "@/components/ProfileFooter";
import { FlipIdCard } from "@/components/FlipIdCard";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const response = await getProfile();
      setProfile(response);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => router.replace("/"), // Go back to Login
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Profile</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <FlipIdCard
          name={profile?.name}
          organization={profile?.organization}
          hostel={profile?.hostel}
          profilePic={profile?.profilePicUrl}
          subLabel={profile?.departmentId}
          badge={profile?.department}
          backTitle="RESIDENCE DETAILS"
          backItems={[
            { label: "ROOM NUMBER", value: profile?.roomNumber || "N/A" },
            { label: "BLOCK", value: profile?.block || "N/A" },
            { label: "ROOM TYPE", value: profile?.roomType || "N/A" },
            {
              label: "DATE OF BIRTH",
              value: profile?.dateOfBirth
                ? new Date(profile.dateOfBirth).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "N/A",
            },
            {
              label: "VALID UP TO",
              value: profile?.createdAt
                ? (() => {
                    const d = new Date(profile.createdAt);
                    d.setFullYear(d.getFullYear() + 1);
                    return d.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  })()
                : "N/A",
              highlight: true,
            },
          ]}
        />

        <ProfileFooter
          email={profile?.email}
          phone={profile?.phone}
          onLogout={handleLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
  },
});
