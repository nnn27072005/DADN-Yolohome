import React, { useState } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ImageSourcePropType,
  Switch,
  Button,
} from "react-native";
import { Card, Title } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [isNotification, setIsNotification] = useState(false);
  const { removeToken, fullname, username } = useAuth();

  const toggleNotification = () => {
    setIsNotification(!isNotification);
  };

  const handleLogout = () => {
    setIsLoggedOut(!isLoggedOut);
    removeToken();
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView
      style={{
        ...styles.container,
        paddingTop: insets.top + 60,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Ionicons name="person-circle" size={100} color="#1A1A2E" />
          </View>
        <Text style={styles.avatarTitle}>{fullname || username || "Nguyễn Văn A"}</Text>
      </View>
      <View style={styles.contentCard}>
        <View style={styles.contentRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="notifications-outline" size={24} color="#555" />
            <Text style={{ fontSize: 18, color: "#333" }}>Thông báo</Text>
          </View>
          <Switch
            value={isNotification}
            onValueChange={toggleNotification}
            trackColor={{ false: "#ccc", true: "#FF9100" }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#E83F25" style={{ marginRight: 8 }} />
          <Text style={{ color: "#E83F25", fontWeight: "bold", fontSize: 18 }}>
            Đăng xuất
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 20,
    gap: 32,
  },
  titleContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  avatarContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  avatarWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  contentCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonLogout: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 14,
    borderColor: "#E83F2520",
    borderWidth: 1,
    backgroundColor: "#E83F2508",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
});
