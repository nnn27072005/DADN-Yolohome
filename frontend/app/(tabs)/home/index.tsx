import { router, useRouter, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

interface DeviceState {
  id: string;
  name: string;
  value: string;
}

interface EquipmentState {
  id: string;
  name: string;
  status: boolean;
}

const indicesIcon = {
  temperature: {
    icon: "thermometer-outline",
    color: "#FF3B30",
    unit: "°C",
    name: "Nhiệt độ",
  },
  light: {
    icon: "sunny",
    color: "#FFCC00",
    unit: "lux",
    name: "Cường độ ánh sáng",
  },
  humidity: {
    icon: "water-outline",
    color: "#007AFF",
    unit: "%",
    name: "Độ ẩm",
  },
};

const equipmentIcon = {
  led: {
    icon: "bulb",
    color: "#4CD964",
    name: "Đèn RGB",
  },
  fan: {
    icon: "sync-outline", // Biểu tượng quạt/xoay
    color: "#007AFF",
    name: "Quạt",
  },
  // Tạm thời comment lại 2 công tắc legacy
  /*
  pump: {
    icon: "logo-usb",
    color: "#5856D6",
    name: "Công tắc USB",
  },
  */
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [isNotification, setIsNotification] = useState(false);
  const navigationRouter = useRouter();
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const webSocketContext = useWebSocket();
  const messages = webSocketContext?.messages || [];
  const { isAuthenticated, fullname, username } = useAuth();
  const [aiOptimized, setAiOptimized] = useState(true);

  const getFirstName = (name: string | null) => {
    if (!name) return username || "user";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1]; // Vietnamese standard: last word is the name
  };

  useEffect(() => {
    if (messages.length > 0) {
      setIsNotification(true);
    }
  }, [messages]);

  const handleNotification = () => {
    setIsNotification(false);
    navigationRouter.push("/home/notification");
  };

  const {
    data: indices,
    isSuccess: isSuccessIndices,
    refetch: refetchIndices,
  } = useQuery({
    queryKey: ["indices"],
    queryFn: async () => {
      const response = await apiCall({ endpoint: "/indices" });
      return response ?? [];
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const {
    data: settings,
    isSuccess: isSuccessSettings,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiCall({ endpoint: "/settings" });
      return response ?? [];
    },
    enabled: isAuthenticated,
  });

  const handleRefresh = () => {
    console.log("Refreshing indices...");
    setCurrentDate(new Date());
    refetchIndices();
    refetchSettings();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      handleRefresh();
    });

    return unsubscribe;
  }, [navigation]);

  const formattedDate = currentDate.toLocaleDateString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <SafeAreaView
      style={{
        ...styles.container,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headingText}>Hello, {getFirstName(fullname)}!</Text>
            {aiOptimized && (
              <View style={styles.aiBadge}>
                <View style={styles.aiDot} />
                <Text style={styles.aiText}>Tối ưu hóa bởi AI</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotification}
          >
            {isNotification && (
              <Image
                source={require("@/assets/images/active.png")}
                style={{ width: 20, height: 20 }}
              />
            )}
            {!isNotification && (
              <Image
                source={require("@/assets/images/notification.png")}
                style={{ width: 20, height: 20 }}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.areaCard}>
          <Image
            source={require("../../../assets/images/yolohome-card-bg.png")}
            style={styles.areaImage}
          />
          <View style={styles.areaOverlay}>
            <View>
              <Text style={styles.areaTitle}>Hệ thống Giám sát</Text>
              <Text style={styles.areaDate}>{formattedDate}</Text>
            </View>
            {/* <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshText}>Làm mới</Text>
            </TouchableOpacity> */}
          </View>
        </View>

        <View style={styles.metricsCard}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={styles.cardTitle}>Chỉ số môi trường</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Trực tiếp</Text>
              </View>
            </View>
            {isSuccessIndices ? (
              Object.keys(indicesIcon).map((key, id) => {
                const indexData = indices?.find((idx: any) => idx.name === key);
                const iconConfig = indicesIcon[key as keyof typeof indicesIcon];
                return (
                  <View key={id} style={styles.metricItem}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: iconConfig.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={iconConfig.icon as any}
                        size={20}
                        color={iconConfig.color}
                      />
                    </View>
                    <Text style={styles.metricName}>{iconConfig.name}</Text>
                    <Text style={styles.metricValue}>
                      {indexData ? indexData.value : "--"}{" "}
                      {iconConfig.unit}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Chưa có dữ liệu cảm biến</Text>
            )}
          </View>
        </View>

        <View style={styles.devicesCard}>
          <View style={{ padding: 16 }}>
            <Text style={styles.cardTitle}>Thiết bị điện</Text>
            {isSuccessSettings && settings && settings.filter((setting: any) => ["led", "fan"].includes(setting.name)).length > 0 ? (
              settings
                .filter((setting: any) => ["led", "fan"].includes(setting.name))
                .map((setting: any, index: number) => (
                  <View key={index} style={styles.deviceItem}>
                    <View style={[styles.iconContainer, { backgroundColor: equipmentIcon[setting.name as keyof typeof equipmentIcon].color + "20" }]}>
                      <Ionicons 
                        name={equipmentIcon[setting.name as keyof typeof equipmentIcon].icon as any} 
                        size={20} 
                        color={equipmentIcon[setting.name as keyof typeof equipmentIcon].color} 
                      />
                    </View>
                    <Text style={styles.deviceName}>
                      {
                        equipmentIcon[setting.name as keyof typeof equipmentIcon]
                          .name
                      }
                    </Text>
                    <Text style={styles.deviceStatus}>
                      {setting.status ? "Đang bật" : "Đang tắt"}
                    </Text>
                  </View>
                ))
            ) : (
              <Text style={styles.emptyText}>Không tìm thấy thiết bị nào</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  headingText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1E88E5",
    marginRight: 8,
  },
  aiText: {
    fontSize: 11,
    color: "#1E88E5",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notificationButton: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationText: {
    color: "#fff",
    fontWeight: "600",
  },
  areaCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  areaImage: {
    width: "100%",
    height: 135,
    opacity: 0.5,
  },
  areaOverlay: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  areaTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  areaDate: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginTop: 4,
  },
  // refreshButton: {
  //   backgroundColor: "#FF9500",
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   borderRadius: 20,
  // },
  // refreshText: {
  //   color: "#fff",
  //   fontWeight: "600",
  // },
  metricsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devicesCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  metricName: {
    flex: 1,
    fontSize: 16,
    color: "#444",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "bold",
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceName: {
    flex: 1,
    fontSize: 16,
    color: "#444",
    fontWeight: "500",
  },
  deviceStatus: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
    backgroundColor: "#E1F5FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    paddingVertical: 20,
    fontStyle: "italic",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    color: "#2E7D32",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
