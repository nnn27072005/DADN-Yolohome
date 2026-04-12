import React from "react";
import { useRouter, useNavigation } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  TextInput,
  Keyboard,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useLayoutEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/contexts/NotificationContext";

const unit = {
  temperature: "°C",
  light: "lux",
};
const device = {
  fan: "Quạt",
  led: "Đèn RGB",
  pump: "Công tắc USB",
};
const mode = {
  manual: "Thủ công",
  scheduled: "Hẹn giờ",
  automatic: "Tự động",
};

const sensor = {
  temperature: "Nhiệt độ",
  light: "Cường độ ánh sáng",
};

interface MessageType {
  id: number;
  is_read: boolean;
  message: string;
  related_entity_id: string;
  timestamp: string;
  type: string;
  user_id: number;
}

export default function NotificationScreen({ id }: { id: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState("device");
  const { notifications } = useNotifications();
  const deviceNotifications: MessageType[] = (notifications || []).filter(
    (notification) => notification.type === "DEVICE_UPDATE"
  ) as MessageType[];
  const sensorNotifications: MessageType[] = (notifications || []).filter(
    (notification) => ["SENSOR_ALERT", "REMINDER_ALERT", "AUTO_ACTION"].includes(notification.type)
  ) as MessageType[];
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({
      tabBarStyle: { display: "none" },
    });
    return () => {
      parent?.setOptions({
        tabBarStyle: {
          position: "absolute",
          bottom: 12,
          left: 20,
          right: 20,
          backgroundColor: "#1A1A2E", // Match main theme
          borderRadius: 30,
          height: 68,
          marginHorizontal: 20,
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
          flexDirection: "row",
          paddingBottom: 28,
          ...styles.shadow,
        },
      });
    };
  }, [navigation]);

  return (
    <SafeAreaView
      style={{
        ...styles.container,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Trở về</Text>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setType("device")}
          style={[styles.tab, type === "device" && styles.tabSelected]}
        >
          <Text style={[type === "device" && styles.textSelected, styles.text]}>
            Thiết bị
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setType("reminder")}
          style={[styles.tab, type === "reminder" && styles.tabSelected]}
        >
          <Text
            style={[type === "reminder" && styles.textSelected, styles.text]}
          >
            Nhắc nhở
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.notificationList}>
        {type === "device" &&
          deviceNotifications.length > 0 &&
          deviceNotifications.map((notification, index) => (
            <View key={index} style={[styles.notificationCard, { borderLeftColor: "#007AFF" }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, { backgroundColor: "#007AFF20" }]}>
                  <Ionicons name="settings-outline" size={20} color="#007AFF" />
                </View>
                <Text style={styles.timestamp}>
                  {formatDateTime(notification.timestamp)}
                </Text>
              </View>
              <Text style={styles.message}>{notification.message}</Text>
            </View>
          ))}

        {type === "device" && deviceNotifications.length === 0 && (
          <View style={styles.loadingContainer}>
            <Image
              source={require("@/assets/images/empty-state.png")}
              style={{ width: 220, height: 220, opacity: 0.8 }}
            />
            <Text style={{ fontSize: 24, color: "#888", fontWeight: "600" }}>Chưa có thông báo nào</Text>
          </View>
        )}
        {type === "reminder" &&
          sensorNotifications.length > 0 &&
          sensorNotifications.map((notification, index) => (
            <View 
              key={index} 
              style={[
                styles.notificationCard, 
                { borderLeftColor: notification.type === "AUTO_ACTION" ? "#4CD964" : "#FF3B30" }
              ]}
            >
              <View style={styles.cardHeader}>
                <View 
                  style={[
                    styles.cardIconContainer, 
                    { backgroundColor: (notification.type === "AUTO_ACTION" ? "#4CD964" : "#FF3B30") + "20" }
                  ]}
                >
                  <Ionicons 
                    name={notification.type === "AUTO_ACTION" ? "flash-outline" : "warning-outline"} 
                    size={20} 
                    color={notification.type === "AUTO_ACTION" ? "#4CD964" : "#FF3B30"} 
                  />
                </View>
                <Text style={styles.timestamp}>
                  {formatDateTime(notification.timestamp)}
                </Text>
              </View>
              <Text style={styles.message}>{notification.message}</Text>
            </View>
          ))}
        {type === "reminder" && sensorNotifications.length === 0 && (
          <View style={styles.loadingContainer}>
            <Image
              source={require("@/assets/images/notification.png")}
              style={{ width: 200, height: 200 }}
            />
            <Text style={{ fontSize: 28 }}>Chưa có lời nhắc nào</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${hours}:${minutes}, ${day}-${month}-${year}`;
}

// function formatDeviceMessage(message: DeviceMessage): string {
//   const deviceName = message.payload.name as keyof typeof device;
//   const deviceMode = message.payload.mode as keyof typeof mode;
//   return `${device[deviceName]} được ${
//     message.payload.status ? "bật" : "tắt"
//   } (${mode[deviceMode]}) ${
//     message.payload.status ? `, cường độ ${message.payload.intensity}%` : ""
//   }`;
// }

// function formatSensorMessage(message: SensorMessage): string {
//   const sensorName = message.payload.index as keyof typeof sensor;
//   return `${sensor[sensorName]} ${
//     message.payload.higherThan ? "cao hơn " + message.payload.higherThan : ""
//   } ${
//     message.payload.lowerThan ? "thấp hơn " + message.payload.lowerThan : ""
//   } ${unit[sensorName as keyof typeof unit] || ""}`;
// }

// function formatSensorMessage(message: SensorMessage): string {
//   const sensorName = message.payload.name as string;
//   return `Cảnh báo: ${sensorName} đã ${message.payload.status ? "vượt ngưỡng" : "trở lại bình thường"}, giá trị hiện tại: ${message.payload.intensity}${unit[sensorName as keyof typeof unit] || ''}`;
// }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#FF9100",
  },
  notificationList: {
    flex: 1,
  },
  notificationCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  timestamp: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  message: {
    fontSize: 15,
    color: "#2C2C2E",
    lineHeight: 22,
    fontWeight: "500",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#FFD7A2",
  },
  tabSelected: {
    borderBottomColor: "#FF9100",
    backgroundColor: "#EFF4CD",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 2,
  },
  textSelected: {
    color: "#FF9100",
    fontWeight: "bold",
    fontSize: 16,
  },
  text: {
    fontSize: 16,
    color: "#FF9100",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginTop: 140,
  },
});
