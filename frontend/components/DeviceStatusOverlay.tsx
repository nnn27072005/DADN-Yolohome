import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSegments } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const { width, height } = Dimensions.get("window");

const deviceIcons: Record<string, any> = {
  led: { lib: Ionicons, name: "bulb-outline", color: "#FFCC00", label: "Đèn RGB" },
  fan: { lib: MaterialCommunityIcons, name: "fan", color: "#007AFF", label: "Quạt" },
  door: { lib: MaterialCommunityIcons, name: "door-open", color: "#FF3B30", label: "Cửa" },
};

const modeLabels: Record<string, string> = {
  manual: "Thủ công",
  automatic: "Tự động",
  scheduled: "Hẹn giờ",
};

const DeviceIcon = ({ name, status }: { name: string, status: boolean }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const iconInfo = deviceIcons[name] || {
    lib: Ionicons,
    name: "help-circle-outline",
    color: "#FFF",
  };
  const IconLib = iconInfo.lib;

  React.useEffect(() => {
    if (status && name === "fan") {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [status, name]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={name === "fan" && status ? { transform: [{ rotate: spin }] } : {}}>
      <IconLib name={iconInfo.name} size={20} color="#FFF" />
    </Animated.View>
  );
};

export default function DeviceStatusOverlay() {
  const segments = useSegments();
  const { isAuthenticated } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Dragging logic
  const pan = useRef(new Animated.ValueXY()).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only start moving if the gesture is more than a small threshold
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: lastOffset.current.x,
          y: lastOffset.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        lastOffset.current.x += gestureState.dx;
        lastOffset.current.y += gestureState.dy;
        pan.flattenOffset();
      },
    })
  ).current;

  // Hide logic moved to render to satisfy Rules of Hooks
  const isSettingsPage = segments.includes("setting");

  const { data: devices } = useQuery<any[]>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiCall({ endpoint: "/settings" });
      return response ?? [];
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({ name, status }: { name: string; status: boolean }) => {
      return apiCall({
        endpoint: `/settings/${name}/status`,
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (isSettingsPage || !isAuthenticated) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {isCollapsed ? (
        <TouchableOpacity
          style={styles.collapsedCircle}
          onPress={() => setIsCollapsed(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="hardware-chip" size={24} color="#FFF" />
          <View style={styles.miniLiveDot} />
        </TouchableOpacity>
      ) : (
        <View style={styles.chatBox}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsCollapsed(true)}
          >
            <Ionicons name="remove" size={16} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.liveDot} />
            <Text style={styles.headerText}>LIVE</Text>
          </View>
          <View style={styles.deviceList}>
            {devices && devices.length > 0 ? (
              devices
                .filter((d) => ["led", "fan", "door"].includes(d.name))
                .map((device) => {
                  return (
                    <TouchableOpacity
                      key={device.name}
                      style={styles.deviceItem}
                      onPress={() =>
                        toggleMutation.mutate({
                          name: device.name,
                          status: device.status,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <DeviceIcon name={device.name} status={device.status} />
                      <View
                        style={[
                          styles.statusIndicator,
                          { backgroundColor: device.status ? "#00FF00" : "#555" },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })
            ) : (
              <Ionicons name="refresh" size={20} color="#FFF" />
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100, // Initial position
    right: 20,
    zIndex: 9999,
  },
  collapsedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF9500",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  miniLiveDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00FF00",
    borderWidth: 1.5,
    borderColor: "#FF9500",
  },
  chatBox: {
    backgroundColor: "#FF9500", // Highlighter Orange
    padding: 12,
    paddingTop: 24, // Space for close button
    borderRadius: 24,
    alignItems: "center",
    gap: 10,
    elevation: 12,
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  closeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFF",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF00",
  },
  deviceList: {
    gap: 14,
  },
  deviceItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: "#FF9500",
  },
});
