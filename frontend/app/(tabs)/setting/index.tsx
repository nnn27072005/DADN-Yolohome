import React, { useState, useEffect, useCallback } from "react";
import SettingsIcon from "@/assets/icons/setting-fill-22.svg";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import settingsMockData from "@/data/settings.mock.json";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
interface DeviceType {
  name: string;
  mode: string;
  status: boolean;
  intensity: number;
  turn_off_after: string | null;
  turn_on_at: string | null;
  repeat: string | null;
  dates: string[] | null;
  updated_at: string;
}

const devicesImage = {
  led: { name: "bulb", color: "#4CD964" },
  fan: { name: "sync-outline", color: "#007AFF" },
  pump: { name: "logo-usb", color: "#5856D6" },
};

const deviceName = {
  led: "Đèn RGB",
  fan: "Quạt",
  pump: "Công tắc USB",
};

const modeName = {
  manual: "Thủ công",
  automatic: "Tự động",
  scheduled: "Hẹn giờ",
};

const CardDevice: React.FC<DeviceType> = ({
  name,
  mode,
  status,
  intensity,
}) => {
  const router = useRouter();
  const [updateStatus, setUpdateStatus] = useState(status);

  const toggleSwitch = () => {
    setUpdateStatus((prev) => !prev);
    saveSettingsMutation.mutate();
  };

  useEffect(() => {
    setUpdateStatus(status);
  }, [status]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiCall({
        endpoint: `/settings/${name}`,
        method: "PUT",
        body: {
          status: !updateStatus, // Toggle logic fix
        },
      });
    },
    onMutate: () => {
      // Optimistic update
    },
    onError: (error) => {
      setUpdateStatus((prev) => !prev);
      console.error("Error saving settings:", error);
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.LeftSection}>
        <View style={[styles.iconContainer, { backgroundColor: (devicesImage[name as keyof typeof devicesImage] as any).color + "20" }]}>
          <Ionicons 
            name={(devicesImage[name as keyof typeof devicesImage] as any).name} 
            size={32} 
            color={(devicesImage[name as keyof typeof devicesImage] as any).color} 
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {deviceName[name as keyof typeof deviceName]}
          </Text>
          <View style={styles.ButtonRow}>
            <Text style={styles.label}>Trạng thái:</Text>
            <Switch
              value={updateStatus}
              onValueChange={toggleSwitch}
              trackColor={{ false: "#ccc", true: "#ffa500" }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.label}>Cường độ: {intensity}%</Text>
        </View>
      </View>
      <View style={styles.ControlSection}>
        <Text style={styles.mode}>
          {modeName[mode as keyof typeof modeName]}
        </Text>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: (devicesImage[name as keyof typeof devicesImage] as any).color }]}
          onPress={() =>
            router.push({
              pathname: "/setting/[device_name]",
              params: { device_name: name },
            } as const)
          }
        >
          <SettingsIcon width={22} height={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SettingTab() {
  const insets = useSafeAreaInsets();
  const [deviceList, setDeviceList] = useState<DeviceType[]>([]);
  const { isAuthenticated } = useAuth();
  const [aiEnabled, setAiEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const {
    data: settings,
    isSuccess,
    isError,
    refetch,
  } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiCall({ endpoint: `/settings` });
      return response ?? [];
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (settings) {
      console.log("settings here", settings);
      setDeviceList(settings);
    }
  }, [settings]);

  return (
    <SafeAreaView
      style={{
        ...styles.container,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 100,
      }}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.aiSettingCard}>
        <View style={styles.aiIconContainer}>
          <Ionicons name="analytics" size={24} color="#1E88E5" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.aiTitle}>Tự động hóa AI</Text>
          <Text style={styles.aiDesc}>Học thói quen và tối ưu hóa tiêu thụ điện năng thông qua AI.</Text>
        </View>
        <Switch
          value={aiEnabled}
          onValueChange={setAiEnabled}
          trackColor={{ false: "#ccc", true: "#1E88E5" }}
        />
      </View>

      <Text style={styles.sectionHeader}>Danh sách thiết bị</Text>

      {deviceList && deviceList.filter((device: DeviceType) => ["led", "fan"].includes(device.name)).length > 0 ? (
        deviceList
          .filter((device: DeviceType) => ["led", "fan"].includes(device.name))
          .map((device: DeviceType, index: number) => (
            <CardDevice key={index} {...device} />
          ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Đang tải danh sách thiết bị...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  titleContainer: {
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  aiSettingCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  aiIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E88E5",
  },
  aiDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeader: {
    alignSelf: "flex-start",
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginTop: 10,
    marginBottom: -10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    elevation: 4,
    height: 140,
    width: "100%",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 82,
    height: 82,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  mode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  ControlSection: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  label: {
    fontSize: 14,
    marginRight: 6,
  },
  LeftSection: {
    gap: 12,
    flexDirection: "row",
  },
  iconButton: {
    padding: 6,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    height: 36,
    width: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    fontStyle: "italic",
  },
});
