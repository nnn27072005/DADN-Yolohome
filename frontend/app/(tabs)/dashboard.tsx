import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LineChart } from "react-native-gifted-charts";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";



interface Dashboard {
  temperature: { value: number; label: string }[];
  humidity: { value: number; label: string }[];
  soil_moisture: { value: number; label: string }[];
  light: { value: number; label: string }[];
}

type Data = {
  label: string;
  value: number;
};

const generateRealtimeTestData = (): Data[] => {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 15 * 60000); // 15 min intervals
    return {
      label: `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`,
      value: 20 + Math.floor(Math.random() * 5),
    };
  });
};

const testData = generateRealtimeTestData();

import ScreenBackground from "@/components/ScreenBackground";

export default function DashboardScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [openCalendar, setOpenCalendar] = useState(false);
  const [type, setType] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(selectedDate);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [dataTemp, setDataTemp] = useState<Data[]>([]);
  const [dataHumidity, setDataHumidity] = useState<Data[]>([]);
  // const [dataSoilMoisture, setDataSoilMoisture] = useState<Data[]>([]);
  const [dataLight, setDataLight] = useState<Data[]>([]);

  const { data, isSuccess } = useQuery({
    queryKey: ["dashboard", selectedDate.toLocaleDateString("en-CA")],
    queryFn: async () => {
      const dateStr = selectedDate.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
      const response = await apiCall({
        endpoint: `/dashboard/${dateStr}`,
      });
      const newData = replaceNullData(response);
      return newData;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000, // Sync with simulator interval
    refetchOnWindowFocus: true,
  });

  const { data: updateData, mutate: updateDashboard } = useMutation({
    mutationFn: async () => {
      const response = await apiCall({
        endpoint: `/dashboard/${selectedDate.toLocaleDateString("en-CA")}`, //YYYY-MM-DD
      });
      const data = replaceNullData(response);
      console.log("response from API:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("update dashboard response from API:", data);
      queryClient.setQueryData(["dashboard"], data);
    },
  });

  useEffect(() => {
    if (data) {
      setDataTemp(data.temperature || []);
      setDataHumidity(data.humidity || []);
      setDataLight(data.light || []);
    }
  }, [data]);

  useEffect(() => {
    if (updateData) {
      console.log("updateData", updateData);
      setDataTemp(updateData.temperature || []);
      setDataHumidity(updateData.humidity || []);
      setDataLight(updateData.light || []);
    }
  }, [updateData]);

  const scrollRefTemp = useRef<any>(null);
  const scrollRefLight = useRef<any>(null);
  const scrollRefHum = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRefTemp.current?.scrollTo({ x: 5000, animated: true });
      scrollRefLight.current?.scrollTo({ x: 5000, animated: true });
      scrollRefHum.current?.scrollTo({ x: 5000, animated: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [dataTemp, dataLight, dataHumidity]);

  const chartConfig = {
    curved: true,
    areaChart: true,
    animateOnDataChange: true,
    animationDuration: 1000,
    onDataChangeAnimationDuration: 1000,
    isAnimated: true,
    hideDataPoints: false, // Show data points for better interaction
    dataPointsColor: "#FF9500",
    dataPointsRadius: 4,
    startOpacity: 0.8,
    endOpacity: 0.3,
    xAxisLabelTextStyle: { fontSize: 10, color: "#666" },
    thickness: 3,
    initialSpacing: 30,
    endSpacing: 30,
    yAxisLabelWidth: 65,
    yAxisTextStyle: { fontSize: 10, color: "#666" },
    yAxisOffset: 0,
    noOfSections: 4,
    hideRules: false,
    rulesColor: "#F0F0F0",
    rulesType: "dashed",
    dashGap: 5,
    dashWidth: 2,
    width: screenWidth - 110,
    spacing: 120, // Increased spacing to ensure scrollbar/slider is needed
    showScrollIndicator: false,
    indicatorColor: "#FF9500",
    height: 130,
    xAxisColor: "#FF9500",
    xAxisThickness: 2,
    yAxisColor: "#FF9500",
    yAxisThickness: 1,
    pointerEvents: "auto",
  };

  const calculateMaxScroll = (dataLength: number) => {
    const totalWidth = dataLength * 120 + 60; // data * spacing + initial + end
    const visibleWidth = screenWidth - 110;
    return Math.max(10, totalWidth - visibleWidth); // Minimum 10 to ensure draggable
  };

  return (
    <ScreenBackground variant="tech" overlayOpacity={0.2}>
      <SafeAreaView
        style={{
          ...styles.container,
          paddingTop: insets.top,
        }}
      >
        <ScrollView 
          style={styles.scrollView} 
          scrollEnabled={!openCalendar}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.header}>
            <View style={styles.dateSelector}>
              <TouchableOpacity onPress={() => setOpenCalendar(!openCalendar)} style={styles.calendarIcon}>
                <Ionicons name="calendar-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.date}>
                {selectedDate.toLocaleDateString("en-CA")}
              </Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Nhiệt độ</Text>
              <Text style={styles.unit}>°C</Text>
            </View>
            <LineChart
              data={dataTemp && dataTemp.length > 0 ? dataTemp : testData}
              {...chartConfig}
              maxValue={50}
              color="#FF3B30"
              startFillColor="rgba(255, 59, 48, 0.7)"
              endFillColor="rgba(255, 240, 240, 0.43)"
              yAxisLabelSuffix="°C"
              scrollRef={scrollRefTemp}
            />
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={calculateMaxScroll(dataTemp?.length || 7)}
              minimumTrackTintColor="#FF9500"
              maximumTrackTintColor="#D3D3D3"
              thumbTintColor="#FF9500"
              onValueChange={(value) => {
                scrollRefTemp.current?.scrollTo({ x: value, animated: false });
              }}
            />
          </View>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Cường độ ánh sáng</Text>
              <Text style={styles.unit}>lux</Text>
            </View>
            <LineChart
              data={dataLight && dataLight.length > 0 ? dataLight : testData}
              {...chartConfig}
              maxValue={800}
              color="#FFCC00"
              startFillColor="rgba(229, 199, 0, 0.7)"
              endFillColor="rgba(255, 240, 240, 0.43)"
              yAxisLabelSuffix=" lx"
              scrollRef={scrollRefLight}
            />
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={calculateMaxScroll(dataLight?.length || 7)}
              minimumTrackTintColor="#FF9500"
              maximumTrackTintColor="#D3D3D3"
              thumbTintColor="#FF9500"
              onValueChange={(value) => {
                scrollRefLight.current?.scrollTo({ x: value, animated: false });
              }}
            />
          </View>
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Độ ẩm</Text>
              <Text style={styles.unit}>%</Text>
            </View>
            <LineChart
              data={dataHumidity && dataHumidity.length > 0 ? dataHumidity : testData}
              {...chartConfig}
              maxValue={100}
              color="#007AFF"
              startFillColor="rgba(0, 122, 255, 0.7)"
              endFillColor="rgba(240, 248, 255, 0.43)"
              yAxisLabelSuffix="%"
              scrollRef={scrollRefHum}
            />
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={calculateMaxScroll(dataHumidity?.length || 7)}
              minimumTrackTintColor="#FF9500"
              maximumTrackTintColor="#D3D3D3"
              thumbTintColor="#FF9500"
              onValueChange={(value) => {
                scrollRefHum.current?.scrollTo({ x: value, animated: false });
              }}
            />
          </View>
        </ScrollView>
        {openCalendar && (
          <>
            <TouchableOpacity
              style={styles.calendarOverlay}
              activeOpacity={1}
              onPress={() => {
                setOpenCalendar(false);
                setTempDate(selectedDate);
              }}
            />
            <View style={styles.calendarContainer}>
              <Calendar
                theme={{
                  backgroundColor: "#ffffff",
                  calendarBackground: "#ffffff",
                  textSectionTitleColor: "#b6c1cd",
                  selectedDayBackgroundColor: "#FF9500",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#FF9500",
                  dayTextColor: "#2d4150",
                  textDisabledColor: "#d9e1e8",
                }}
                markedDates={{
                  [tempDate.toLocaleDateString("en-CA")]: { selected: true },
                }}
                minDate={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 4); // 5 days including today: today, yesterday, ..., 4 days ago
                  return d.toLocaleDateString("en-CA");
                })()}
                maxDate={new Date().toLocaleDateString("en-CA")}
                onDayPress={(day: { timestamp: number }) => {
                  setTempDate(new Date(day.timestamp));
                }}
                disableAllTouchEventsForDisabledDays={true}
              />
              <View style={styles.calendarButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setOpenCalendar(false);
                    setTempDate(selectedDate);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    setSelectedDate(tempDate);
                    setOpenCalendar(false);
                    updateDashboard();
                  }}
                >
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    paddingHorizontal: 20,
    flex: 1,
  },
  titleContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 24,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  calendarIcon: {
    padding: 2,
  },
  date: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  viewSelector: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewSelectorText: {
    color: "#fff",
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 16,
    height: 250,
    width: "100%",
    gap: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    // marginBottom: 8,
    // marginLeft: 16,
  },
  unit: {
    fontSize: 14,
  },

  chart: {
    marginVertical: 8,
    borderColor: "red",
    borderWidth: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    width: "90%",
    position: "absolute",
    top: "30%",
    left: "5%",
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  cancelButton: {
    backgroundColor: "#D9D9D9",
    padding: 10,
    borderRadius: 8,
    width: "45%",
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#FF9500",
    padding: 10,
    borderRadius: 8,
    width: "45%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

const replaceNullData = (data: any) => {
  if (!data || typeof data !== 'object') return {};
  const filled: any = {};
  for (const key in data) {
    if (Array.isArray(data[key])) {
      filled[key] = data[key].map((item: any) => ({
        ...item,
        value: item.value ?? 0,
      }));
    } else {
      filled[key] = data[key];
    }
  }
  return filled;
};
