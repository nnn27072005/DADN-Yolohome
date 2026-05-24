import { router, useRouter, useNavigation } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ImageSourcePropType,
  Modal,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketProvider";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

interface DeviceState {
  id: string;
  name: string;
  value: string;
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
    lib: Ionicons,
    icon: "bulb",
    color: "#4CD964",
    name: "Đèn RGB",
  },
  fan: {
    lib: MaterialCommunityIcons,
    icon: "fan",
    color: "#007AFF",
    name: "Quạt",
  },
  door: {
    lib: MaterialCommunityIcons,
    icon: "door-closed",
    color: "#FF9500",
    name: "Cửa ra vào",
  },
};

const securityIcon = {
  pir: {
    icon: "walk-outline",
    color: "#FF3B30",
    name: "Cảm biến chuyển động",
  },
  ai: {
    icon: "eye-outline",
    color: "#5856D6",
    name: "Nhận diện khuôn mặt",
  },
};

import ScreenBackground from "@/components/ScreenBackground";

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

  // Door authentication flow states
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "requesting" | "authenticating" | "success" | "failed">("idle");
  const [cooldownTime, setCooldownTime] = useState(0);
  const [authMessage, setAuthMessage] = useState("");
  const lastProcessedMsgId = useRef<number | null>(null);

  const triggerAuthFlow = () => {
    setAuthStatus("requesting");
    setAuthMessage("Phát hiện chuyển động ở cửa! Bạn có muốn kích hoạt camera để xác thực khuôn mặt và mở cửa?");
    setIsAuthModalVisible(true);
  };

  const startAuthentication = async () => {
    try {
      setAuthStatus("authenticating");
      setAuthMessage("Đang mở camera và xác thực khuôn mặt...");
      await apiCall({
        endpoint: "/settings/door/request-auth",
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to start authentication:", err);
      setAuthStatus("failed");
      setAuthMessage("Không thể khởi động camera để xác thực.");
      setCooldownTime(15);
    }
  };

  const handleReauthenticate = () => {
    setCooldownTime(0);
    startAuthentication();
  };

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
    refetchInterval: 5000,
  });

  // Decrement cooldown time every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTime]);

  // Check PIR state when cooldown finishes if state is failed
  useEffect(() => {
    if (cooldownTime === 0 && authStatus === "failed") {
      const pirValue = indices?.find((idx: any) => idx.name === "pir")?.value;
      if (pirValue === "1" || pirValue === 1) {
        // PIR is still active -> repeat process
        triggerAuthFlow();
      } else {
        // Return to idle
        setAuthStatus("idle");
        setIsAuthModalVisible(false);
      }
    }
  }, [cooldownTime, authStatus, indices]);

  // Process WebSocket messages for real-time updates
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.id !== lastProcessedMsgId.current) {
        lastProcessedMsgId.current = latestMessage.id;
        
        if (latestMessage.type === "MQTT_MESSAGE" && latestMessage.payload) {
          const { feed, value } = latestMessage.payload;
          
          if (feed === "pir") {
            if (value === "1" || value === 1 || value === "ON") {
              if (authStatus === "idle") {
                triggerAuthFlow();
              }
            }
          } else if (feed === "ai-result") {
            const resultIndex = parseInt(value, 10);
            if (resultIndex === 0) {
              setAuthStatus("success");
              setAuthMessage("Xác thực THÀNH CÔNG! Chào mừng chủ nhà đã về. Cửa đang mở...");
              refetchSettings();
              refetchIndices();
              setTimeout(() => {
                setIsAuthModalVisible(false);
                setAuthStatus("idle");
                setAuthMessage("");
              }, 3500);
            } else if (resultIndex === 1) {
              setAuthStatus("failed");
              setAuthMessage("Xác thực THẤT BẠI! Phát hiện người lạ trước cửa.");
              setCooldownTime(15);
            }
          }
        }
      }
    }
  }, [messages, authStatus]);

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
    <ScreenBackground variant="main" overlayOpacity={0.15}>
      <SafeAreaView
        style={{
          ...styles.container,
          paddingTop: insets.top,
        }}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
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

          <View style={styles.metricsCard}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={styles.cardTitle}>An ninh & Cửa</Text>
                <MaterialCommunityIcons name="shield-check" size={24} color="#4CD964" />
              </View>

              {/* Door Status */}
              <View style={styles.metricItem}>
                <View style={[styles.iconContainer, { backgroundColor: equipmentIcon.door.color + "20" }]}>
                  <MaterialCommunityIcons name={equipmentIcon.door.icon as any} size={20} color={equipmentIcon.door.color} />
                </View>
                <Text style={styles.metricName}>{equipmentIcon.door.name}</Text>
                <Text style={[styles.statusBadge, { color: settings?.find((s: any) => s.name === "door")?.status ? "#4CD964" : "#8E8E93" }]}>
                  {settings?.find((s: any) => s.name === "door")?.status ? "ĐANG MỞ" : "ĐANG ĐÓNG"}
                </Text>
              </View>

              {/* PIR Status */}
              <View style={styles.metricItem}>
                <View style={[styles.iconContainer, { backgroundColor: securityIcon.pir.color + "20" }]}>
                  <Ionicons name={securityIcon.pir.icon as any} size={20} color={securityIcon.pir.color} />
                </View>
                <Text style={styles.metricName}>{securityIcon.pir.name}</Text>
                <Text style={[styles.statusBadge, { color: indices?.find((idx: any) => idx.name === "pir")?.value === "1" ? "#FF3B30" : "#8E8E93" }]}>
                  {indices?.find((idx: any) => idx.name === "pir")?.value === "1" ? "CÓ CHUYỂN ĐỘNG" : "BÌNH THƯỜNG"}
                </Text>
              </View>

              {/* AI Recognition Status */}
              <View style={styles.metricItem}>
                <View style={[styles.iconContainer, { backgroundColor: securityIcon.ai.color + "20" }]}>
                  <Ionicons name={securityIcon.ai.icon as any} size={20} color={securityIcon.ai.color} />
                </View>
                <Text style={styles.metricName}>{securityIcon.ai.name}</Text>
                <Text style={[styles.statusBadge, { color: "#5856D6" }]}>
                  ĐANG HOẠT ĐỘNG
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Door Authentication Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isAuthModalVisible}
          onRequestClose={() => {
            if (authStatus !== "success") {
              setIsAuthModalVisible(false);
              setAuthStatus("idle");
            }
          }}
        >
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header / Icon */}
              <View style={styles.modalHeader}>
                {authStatus === "requesting" && (
                  <View style={[styles.modalIconContainer, { backgroundColor: "#FF950020" }]}>
                    <Ionicons name="shield-alert-outline" size={40} color="#FF9500" />
                  </View>
                )}
                {authStatus === "authenticating" && (
                  <View style={[styles.modalIconContainer, { backgroundColor: "#007AFF20" }]}>
                    <ActivityIndicator size="large" color="#007AFF" />
                  </View>
                )}
                {authStatus === "success" && (
                  <View style={[styles.modalIconContainer, { backgroundColor: "#4CD96420" }]}>
                    <Ionicons name="lock-open-outline" size={40} color="#4CD964" />
                  </View>
                )}
                {authStatus === "failed" && (
                  <View style={[styles.modalIconContainer, { backgroundColor: "#FF3B3020" }]}>
                    <Ionicons name="shield-remove-outline" size={40} color="#FF3B30" />
                  </View>
                )}
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>
                {authStatus === "requesting" && "Yêu cầu Xác thực"}
                {authStatus === "authenticating" && "Đang xác thực"}
                {authStatus === "success" && "Xác thực thành công"}
                {authStatus === "failed" && "Xác thực thất bại"}
              </Text>

              {/* Message */}
              <Text style={styles.modalMessage}>{authMessage}</Text>

              {/* Actions */}
              <View style={styles.modalActions}>
                {authStatus === "requesting" && (
                  <>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={startAuthentication}
                    >
                      <Text style={styles.modalButtonTextPrimary}>Mở Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSecondary, { marginTop: 8 }]}
                      onPress={() => {
                        setIsAuthModalVisible(false);
                        setAuthStatus("idle");
                      }}
                    >
                      <Text style={styles.modalButtonTextSecondary}>Đóng</Text>
                    </TouchableOpacity>
                  </>
                )}

                {authStatus === "authenticating" && (
                  <>
                    <Text style={styles.modalStatusSubtext}>Vui lòng hướng khuôn mặt vào camera...</Text>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSecondary, { marginTop: 16 }]}
                      onPress={() => {
                        setIsAuthModalVisible(false);
                        setAuthStatus("idle");
                      }}
                    >
                      <Text style={styles.modalButtonTextSecondary}>Hủy</Text>
                    </TouchableOpacity>
                  </>
                )}

                {authStatus === "success" && (
                  <Text style={styles.modalStatusSubtextSuccess}>Cửa sẽ tự động đóng lại sau vài giây.</Text>
                )}

                {authStatus === "failed" && (
                  <>
                    {cooldownTime > 0 ? (
                      <View style={styles.cooldownContainer}>
                        <Text style={styles.cooldownText}>
                          Quét lại tự động sau: <Text style={styles.cooldownSec}>{cooldownTime}s</Text>
                        </Text>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalButtonPrimary, { marginTop: 12 }]}
                          onPress={handleReauthenticate}
                        >
                          <Text style={styles.modalButtonTextPrimary}>Xác thực lại ngay</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonPrimary]}
                        onPress={startAuthentication}
                      >
                        <Text style={styles.modalButtonTextPrimary}>Xác thực lại</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSecondary, { marginTop: 8 }]}
                      onPress={() => {
                        setIsAuthModalVisible(false);
                        setAuthStatus("idle");
                      }}
                    >
                      <Text style={styles.modalButtonTextSecondary}>Đóng</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </BlurView>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: "#fff", // White text for dark background
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  statusBadge: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    width: "100%",
    alignItems: "center",
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPrimary: {
    backgroundColor: "#FF9500",
  },
  modalButtonSecondary: {
    backgroundColor: "#F2F2F7",
  },
  modalButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextSecondary: {
    color: "#8E8E93",
    fontSize: 16,
    fontWeight: "600",
  },
  modalStatusSubtext: {
    fontSize: 14,
    color: "#007AFF",
    fontStyle: "italic",
    textAlign: "center",
  },
  modalStatusSubtextSuccess: {
    fontSize: 14,
    color: "#4CD964",
    fontStyle: "italic",
    textAlign: "center",
  },
  cooldownContainer: {
    width: "100%",
    alignItems: "center",
  },
  cooldownText: {
    fontSize: 15,
    color: "#FF3B30",
    fontWeight: "600",
    textAlign: "center",
  },
  cooldownSec: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
