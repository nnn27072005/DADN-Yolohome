import React, { useState, useEffect, useRef, useCallback } from "react";
import SettingsIcon from "@/assets/icons/setting-fill-22.svg";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  Platform,
  Pressable,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import AddNewButton from "@/assets/images/addButton.svg";
import { SwipeListView } from "react-native-swipe-list-view";
import RemoveButton from "@/assets/images/Remove.svg";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const unit = {
  temperature: "°C",
  light: "lux",
};

const name = {
  temperature: "Nhiệt độ",
  light: "Cường độ ánh sáng",
};

const iconMapping = {
  temperature: {
    icon: "thermometer-outline",
    color: "#FF3B30",
  },
  light: {
    icon: "sunny",
    color: "#FFCC00",
  },
};

interface ReminderType {
  id: string;
  index: string;
  higherThan: number;
  lowerThan: number;
  repeatAfter: number;
  active?: boolean;
  onDelete?: (id: string) => void;
}
const CardReminder: React.FC<ReminderType> = ({
  id,
  index,
  higherThan,
  lowerThan,
  repeatAfter,
  active,
  onDelete,
}) => {
  const [updateStatus, setUpdateStatus] = useState(active);

  const toggleSwitch = () => {
    setUpdateStatus((prev) => !prev);
    saveSettingsMutation.mutate();
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiCall({
        endpoint: `/reminders/${id}/status`,
        method: "PATCH",
      });
    },
    onError: (error) => {
      setUpdateStatus((prev) => !prev);
      console.error("Error saving settings:", error);
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.LeftSection}>
        <View style={[styles.iconContainer, { backgroundColor: (iconMapping[index as keyof typeof iconMapping] as any)?.color + "20" }]}>
          <Ionicons 
            name={(iconMapping[index as keyof typeof iconMapping] as any)?.icon} 
            size={24} 
            color={(iconMapping[index as keyof typeof iconMapping] as any)?.color} 
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name[index as keyof typeof name]}</Text>
          <View style={styles.displayRow}>
            {higherThan && (
              <Text style={styles.label}>
                {higherThan
                  ? "Cao hơn " +
                    higherThan +
                    " " +
                    unit[index as keyof typeof unit]
                  : ""}
              </Text>
            )}
            {lowerThan && (
              <Text style={styles.label}>
                {lowerThan
                  ? "Thấp hơn " +
                    lowerThan +
                    " " +
                    unit[index as keyof typeof unit]
                  : ""}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.ControlSection}>
        <Switch
          value={updateStatus}
          onValueChange={toggleSwitch}
          trackColor={{ false: "#ccc", true: "#ffa500" }}
          thumbColor="#fff"
        />
      </View>
      <Pressable 
        style={styles.deleteIconButton} 
        onPress={() => onDelete && onDelete(id)}
        hitSlop={20}
      >
        <Ionicons name="trash-outline" size={20} color="#E83F25" />
      </Pressable>
    </View>
  );
};

export default function ReminderTab() {
  const insets = useSafeAreaInsets();
  const [reminderList, setReminderList] = useState<ReminderType[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const listViewRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useFocusEffect(
    useCallback(() => {
      listViewRef.current?.closeAllOpenRows?.();
      refetch();
    }, [])
  );

  const handleDelete = useMutation({
    mutationFn: async (id: string) => {
      console.log("handleDelete ~ id:", id);
      return apiCall({ endpoint: `/reminders/${id}`, method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => {
      console.error("Error deleting reminder:", error);
    },
  });

  const {
    data: reminders,
    isSuccess,
    isLoading,
    refetch,
  } = useQuery<any>({
    queryKey: ["reminders"],
    queryFn: async () => {
      const response = await apiCall({ endpoint: `/reminders` });
      console.log(" ~ queryFn: ~ response:", response);
      return response;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (reminders) {
      console.log("reminders", reminders);
      setReminderList(reminders);
    }
  }, [reminders]);

  return (
    <SafeAreaView
      style={{
        ...styles.container,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Reminders</Text>
      </View>
      {isLoading || reminderList.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
          <Text style={{ fontSize: 24, color: "#888", fontWeight: "600" }}>Chưa có lời nhắc nào</Text>
        </View>
      ) : (
      <View style={styles.scrollWrapper}>
        <SwipeListView
          ref={listViewRef}
          data={reminderList.filter((r) => ["temperature", "light"].includes(r.index))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardReminder 
              {...item} 
              onDelete={(id) => {
                setDeletingId(id);
                setIsDeleteModalVisible(true);
              }} 
            />
          )}
              renderHiddenItem={({ item }) => (
                <View style={styles.rowBack}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      setDeletingId(item.id);
                      setIsDeleteModalVisible(true);
                    }}
                  >
                    <RemoveButton width={44} height={44} />
                  </TouchableOpacity>
                </View>
              )}
              rightOpenValue={-75}
              disableRightSwipe
              contentContainerStyle={styles.reminderList}
              recalculateHiddenLayout={true}
            />
          </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          router.push({
            pathname: "/reminder/setting_reminder",
          } as const)
        }
      >
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Thêm</Text>
        <AddNewButton width={48} height={48} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận xoá</Text>
            <Text style={styles.modalMessage}>Bạn có chắc chắn muốn xoá lời nhắc này không?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => {
                  if (deletingId) {
                    handleDelete.mutate(deletingId);
                    setIsDeleteModalVisible(false);
                    setDeletingId(null);
                  }
                }}
              >
                <Text style={styles.modalDeleteText}>Xoá</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 20,
    justifyContent: "flex-start",
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
  scrollWrapper: {
    height: "80%",
    width: "100%",
  },
  reminderList: {
    gap: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    elevation: 4,
    height: 112,
    width: "100%",
    gap: 12,
    position: "relative",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flexDirection: "column",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
  },
  displayRow: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  ControlSection: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  label: {
    fontSize: 16,
  },
  LeftSection: {
    gap: 12,
    flexDirection: "row",
  },
  iconButton: {
    padding: 4,
    borderRadius: 8,
    elevation: 100,
    shadowColor: "#000",
    shadowOffset: { width: 12, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 56,
    width: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  rowBack: {
    alignItems: "center",
    // backgroundColor: "black",
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    borderRadius: 20,
    width: "100%",
    height: 112,
  },
  deleteButton: {
    backgroundColor: "#E83F25",
    width: 65,
    height: 112,
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderRadius: 20,
  },
  deleteIconButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    zIndex: 99,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 63, 37, 0.08)",
    borderRadius: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F5F5F7",
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#E83F25",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
