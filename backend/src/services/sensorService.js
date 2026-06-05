const {
  getAdafruitHumidData,
  getAdafruitLightData,
  getAdafruitThermalData,
} = require("../controllers/adafruitController");
const sensorRepository = require("../repository/sensorRepository");

const {
  getHistory,
  getLatest,
  saveSensor,
} = require("../repository/sensorRepository");

const { getPrediction } = require("../YolohomeModel/prediction");

const settingsRepository = require("../repository/settingsRepository");

const settingsService = require("./settingsService");

// Import trực tiếp từ module
const getFeedKey = settingsService.getFeedKey;
const calculateScheduledStatus = settingsService.calculateScheduledStatus;
const determineMqttPayloadFromSettings = settingsService.determineMQttPayload;
const { publishToFeed } = require("./mqttpublisher");
const {
  recordAutoCommand,
  isAutoCommandCoolingDown,
  isManualCommandCoolingDown,
} = require("./deviceCommandGuard");
const notificationService = require("../services/NotificationService");

// dùng cho dashboard, trả về dữ liệu 7 giờ 1 ngày
const TARGET_HOURS = [0, 4, 8, 12, 16, 20, 24];
const SENSOR_TYPES = ["thermal", "humid", "light"];
const AUTO_CONTROL_DEBOUNCE_MS = Number(
  process.env.AUTO_CONTROL_DEBOUNCE_MS || 3000
);

class SensorService {
  constructor() {
    this.automationTimer = null;
    this.isAutomationRunning = false;
    this.hasPendingAutomationRun = false;
  }

  async syncFeed(feedKey) {
    let fetchFeedDataFn;

    try {
      switch (feedKey) {
        case "humid":
          fetchFeedDataFn = getAdafruitHumidData;
          break;
        case "thermal":
          fetchFeedDataFn = getAdafruitThermalData;
          break;
        case "light":
          fetchFeedDataFn = getAdafruitLightData;
          break;
        case "pir":
          // Skip sync for PIR for now as it's event-driven
          return [];
        default:
          throw new Error("Invalid feed key");
      }

      const feedData = await fetchFeedDataFn();

      if (!Array.isArray(feedData)) {
        throw new Error("Expected feed data to be an array");
      }

      const savedResults = [];
      for (const item of feedData) {
        const { value, created_at } = item;
        if (!value || !created_at) {
          console.warn("Skipping invalid feed item:", item);
          continue; // skip instead of throw to continue syncing
        }

        const saved = await saveSensor(feedKey, value, created_at);
        savedResults.push(saved);
      }

      return savedResults;
    } catch (error) {
      console.error(`Error syncing feed ${feedKey}:`, error);
      throw error;
    }
  }

  async getFeedLatest(feedKey) {
    return getLatest(feedKey);
  }

  async getFeedHistory(feedKey, startTime, endTime, page, pageSize) {
    return getHistory(feedKey, startTime, endTime, page, pageSize);
  }

  // 06 05 2025
  async getLatestSensorDataForAllFeeds() {
    const feeds = ["thermal", "humid", "light"];
    const latestData = {};
    for (const feed of feeds) {
      const data = await sensorRepository.getLatest(feed);
      if (data) {
        latestData[feed] = data.value;
      }
    }
    return latestData;
  }

  async getDailyDashboardData(date) {
    const startTime = `${date} 00:00:00`;
    const endTime = `${date} 23:59:59`;

    const dashboardData = {};

    const keyMapping = {
      thermal: "temperature",
      humid: "humidity",
      light: "light",
    };

    // duyệt từng loại sensor
    for (const sensorType of SENSOR_TYPES) {
      // DB returns DESC order, we sort ASC here to get oldest→newest
      const rawData = await sensorRepository.getDailySensorData(
        sensorType,
        startTime,
        endTime,
      );

      const processedData = this.processSensorDataForHours(rawData, TARGET_HOURS);
      const responseKey = keyMapping[sensorType] || sensorType;
      dashboardData[responseKey] = processedData;
    }

    return dashboardData;
  }

  // xử lí data từ dashboard
  processSensorDataForHours(rawData, targetHours) {
    if (!rawData || rawData.length === 0) {
      return targetHours.map((hour) => ({
        label: String(hour),
        value: null,
      }));
    }

    // sort rawData theo timestamp
    rawData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const finalResults = [];

    for (const hour of targetHours) {
      let closestData = null;
      let minDiff = Infinity;
      let found = false;

      for (const item of rawData) {
        const itemDate = new Date(item.timestamp);
        const itemHour = itemDate.getHours();
        const itemMinutes = itemDate.getMinutes();
        // Tính giờ dạng số thập phân (ví dụ: 8.5 cho 8:30)
        const itemTimeValue = itemHour + itemMinutes / 60;

        const diff = Math.abs(itemTimeValue - hour);

        // Nếu tìm thấy giá trị gần hơn -> cập nhật closestData và minDiff
        if (diff < minDiff) {
          minDiff = diff;
          closestData = item;
          found = true;
        }

        if (itemTimeValue > hour + 1 && found) {
          break;
        }
      }

      finalResults.push({
        label: String(hour),
        value: closestData ? Math.round(parseFloat(closestData.value)) : null,
      });
    }

    return finalResults;
  }

  async getLatestSensorData() {
    try {
      const data = await sensorRepository.getLatestSensorData();
      if (!data) {
        return {
          message: "No data found",
        };
      }
      return data;
    } catch (error) {
      console.error("Error getting latest sensor data:", error);
      throw error;
    }
  }

  async saveSensorData(feedName, value, timestamp = new Date()) {
    return this.saveSensorDataAndTriggerControl(feedName, value, timestamp);
  }

  // Lưu data từ sensor và kiểm tra dự đoán
  // Được gọi khi MQTT nhận được dữ liệu mới từ các sensor
  async saveSensorDataAndTriggerControl(feedName, value, timestamp) {
    try {
      const savedData = await sensorRepository.saveSensor(
        feedName,
        value,
        timestamp,
      );
      console.log(`Sensor data saved for ${feedName}:, ${value}`);
      this.requestAutomationControl(`sensor:${feedName}`);
    } catch (error) {
      console.error(`Error saving sensor data for ${feedName}:`, error);
      // throw error;
    }
  }

  // Kiểm tra các sensor ở chế độ automatic của tất cả các sensor
  requestAutomationControl(source = "sensor") {
    if (this.automationTimer) {
      clearTimeout(this.automationTimer);
    }

    this.automationTimer = setTimeout(() => {
      this.automationTimer = null;
      this.triggerAutomationControl({ source }).catch((error) => {
        console.error("[AutoControl] Debounced run failed:", error);
      });
    }, AUTO_CONTROL_DEBOUNCE_MS);
  }

  async triggerAutomationControl(options = {}) {
    const source = options.source || "periodic";

    if (this.isAutomationRunning) {
      this.hasPendingAutomationRun = true;
      console.log(
        `[AutoControl] Skipping overlapping run from ${source}; pending run marked.`,
      );
      return;
    }

    this.isAutomationRunning = true;
    console.log(
      `[AutoControl] Checking automatic and scheduled control conditions from ${source}...`,
    );
    let allSettings;
    let latestSensorObj = {};

    try {
    try {
      allSettings = await settingsRepository.getAllSettings();
      const latestSensorsArray = await sensorRepository.getLatestSensorData(); // Lấy hết data sensor mới nhất

      if (
        !allSettings ||
        !latestSensorsArray ||
        latestSensorsArray.length === 0
      ) {
        console.warn("[AutoControl] No settings or latest sensor data found.");
        return;
      }

      // Chuyển latestSensorsArray thành object
      latestSensorObj = latestSensorsArray.reduce((acc, sensor) => {
        let keyName = sensor.name; // Dùng name từ DB (đã map trong model)
        if (keyName === "temperature") keyName = "thermal";
        else if (keyName === "humidity") keyName = "humid";
        else if (keyName === "light") keyName = "light";

        acc[keyName] = sensor;
        return acc;
      }, {});
    } catch (error) {
      console.error(
        "[AutoControl] Error fetching settings or latest sensor data:",
        error,
      );
      return;
    }

    for (const setting of allSettings) {
      const deviceName = setting.name;

      // === Xử lý AUTOMATIC mode ===
      if (setting.mode === "automatic") {
        if (isManualCommandCoolingDown(deviceName)) {
          console.log(
            `[AutoControl ${deviceName}] Skipped because a manual command was sent recently.`,
          );
          continue;
        }

        if (isAutoCommandCoolingDown(deviceName)) {
          console.log(
            `[AutoControl ${deviceName}] Skipped because automatic command cooldown is active.`,
          );
          continue;
        }

        let relevantInputData = {};
        let canPredict = true;

        try {
          // Chuẩn bị input data
          switch (deviceName) {
            case "fan":
              if (latestSensorObj["thermal"] && latestSensorObj["humid"]) {
                relevantInputData = {
                  temperature: latestSensorObj["thermal"].value,
                  humidity: latestSensorObj["humid"].value,
                };
              } else {
                canPredict = false;
              }
              break;
            case "led":
              if (
                latestSensorObj["light"] &&
                latestSensorObj["thermal"] &&
                latestSensorObj["humid"]
              ) {
                const currentDate = new Date();
                const minuteOfDay =
                  currentDate.getHours() * 60 + currentDate.getMinutes();
                relevantInputData = {
                  Light_Intensity: latestSensorObj["light"].value,
                  Temperature: latestSensorObj["thermal"].value,
                  Humidity: latestSensorObj["humid"].value,
                  Minute_Of_Day: minuteOfDay,
                };
              } else {
                canPredict = false;
              }
              break;
            default:
              console.warn(
                `[AutoControl] Unknown device name in automatic check: ${deviceName}`,
              );
              continue; // Bỏ qua thiết bị không xác định
          }

          if (!canPredict) {
            const requiredFeedsMap = {
              fan: ["thermal", "humid"],
              led: ["light", "thermal", "humid"],
            };
            const missingFeeds = (requiredFeedsMap[deviceName] || []).filter(
              (feed) => !latestSensorObj[feed],
            );
            console.warn(
              `[AutoControl] Cannot predict for ${deviceName} due to missing sensor data: ${missingFeeds.join(
                ", ",
              )}`,
            );
            continue; // Bỏ qua nếu thiếu dữ liệu
          }

          // Predict
          console.log(
            `[AutoControl] Predicting control for ${deviceName} with data: ${JSON.stringify(
              relevantInputData,
            )}`,
          );
          const predictionResult = await getPrediction(
            deviceName,
            relevantInputData,
          );

          // Xử lý kết quả prediction
          let predictedStatus;
          if (deviceName === "led") {
            predictedStatus = parseInt(predictionResult, 10) === 1;
          } else {
            predictedStatus = predictionResult === "BẬT";
          }
          console.log(
            `[AutoControl] Prediction result for ${deviceName}: ${predictedStatus}`,
          );

          // === TÍNH TOÁN CƯỜNG ĐỘ (INTENSITY) TỰ ĐỘNG ===
          let predictedIntensity = setting.intensity; // Mặc định giữ nguyên
          if (predictedStatus) {
            if (deviceName === "fan") {
              const temp = parseFloat(relevantInputData.temperature);
              if (temp >= 35) predictedIntensity = 100;
              else if (temp >= 32) predictedIntensity = 80;
              else if (temp >= 29) predictedIntensity = 60;
              else predictedIntensity = 40;
            } else if (deviceName === "led") {
              const light = parseFloat(relevantInputData.Light_Intensity);
              if (light <= 30) predictedIntensity = 100;
              else if (light <= 70) predictedIntensity = 70;
              else if (light <= 110) predictedIntensity = 40;
              else predictedIntensity = 20;
            }
          }

          // *** CẬP NHẬT VÀ PUBLISH NẾU STATUS HOẶC INTENSITY THAY ĐỔI ***
          const hasStatusChanged = setting.status !== predictedStatus;
          const hasIntensityChanged =
            predictedStatus && setting.intensity !== predictedIntensity;

          if (hasStatusChanged || hasIntensityChanged) {
            console.log(
              `[AutoControl ${deviceName}] Change detected: status(${setting.status}->${predictedStatus}), intensity(${setting.intensity}->${predictedIntensity})`,
            );
            const feedKey = getFeedKey(deviceName);
            if (!feedKey) {
              console.warn(
                `[AutoControl] Unknown feed key for device: ${deviceName}`,
              );
              continue;
            }

            // Tính payload MQTT dựa trên status mới và intensity hiện tại
            const settingsForPayload = {
              ...setting,
              status: predictedStatus,
              intensity: predictedIntensity,
            }; // Cường độ đã được tính toán tự động ở trên
            const mqttPayload = determineMqttPayloadFromSettings(
              deviceName,
              settingsForPayload,
            );

            if (mqttPayload !== null) {
              console.log(
                `[AutoControl ${deviceName}] Publishing to ${feedKey} payload: ${mqttPayload}`,
              );
              const published = publishToFeed(feedKey, mqttPayload); // Gửi MQTT
              if (published) {
                recordAutoCommand(deviceName);
              }

              // Cập nhật status và intensity mới vào DB
              try {
                await settingsRepository.updateSettingByName(deviceName, {
                  status: predictedStatus,
                  intensity: predictedIntensity,
                });
                console.log(
                  `[AutoControl ${deviceName}] Updated database: status=${predictedStatus}, intensity=${predictedIntensity}`,
                );

                // update thông báo
                try {
                  const notificationMessage = `Device '${deviceName}' was automatically turned ${
                    predictedStatus ? "ON" : "OFF"
                  } based on sensor readings.`;
                  // Tạm ẩn để tránh lỗi TypeError vì hàm này chưa được define trong NotificationService
                  // await notificationService.createNotificationForAllUsers(
                  //   notificationMessage,
                  //   "AUTO_CONTROL", // Loại thông báo
                  //   deviceName,
                  // );
                  console.log(
                    `[Notification] (Skipped) Created for ALL users - ${deviceName} auto control`,
                  );
                } catch (notificationError) {
                  console.error(
                    `[Notification] Failed to create for ALL users - ${deviceName} auto control:`,
                    notificationError,
                  );
                }
              } catch (dbError) {
                console.error(
                  `[AutoControl ${deviceName}] Failed to update database status after prediction:`,
                  dbError,
                );
              }
            } else {
              console.warn(
                `[AutoControl ${deviceName}] Could not determine MQTT payload.`,
              );
            }
          } else {
            console.log(
              `[AutoControl ${deviceName}] Status (${predictedStatus}) matches prediction. No change needed.`,
            );
          }
        } catch (error) {
          console.error(
            `[AutoControl] Error during prediction or control for ${deviceName}:`,
            error,
          );
        }

        // === Xử lý SCHEDULED mode ===
      } else if (setting.mode === "scheduled") {
        try {
          // Tính toán status mới dựa trên lịch trình
          const calculatedStatus = calculateScheduledStatus(setting);
          console.log(
            `[ScheduleCheck ${deviceName}] Current DB status: ${setting.status}, Calculated scheduled status: ${calculatedStatus}`,
          );

          // Nếu trạng thái trong DB khác với trạng thái tính toán được
          // -> gửi MQTT và cập nhật DB
          if (setting.status !== calculatedStatus) {
            console.log(
              `[ScheduleCheck ${deviceName}] Status mismatch detected (${setting.status} -> ${calculatedStatus}). Updating...`,
            );
            const feedKey = getFeedKey(deviceName);
            if (!feedKey) {
              console.warn(
                `[ScheduleCheck] Unknown feed key for device: ${deviceName}`,
              );
              continue;
            }

            // Tính payload MQTT dựa trên status mới và intensity hiện tại
            const settingsForPayload = {
              ...setting,
              status: calculatedStatus,
            };
            const mqttPayload = determineMqttPayloadFromSettings(
              deviceName,
              settingsForPayload,
            );

            if (mqttPayload !== null) {
              console.log(
                `[ScheduleCheck ${deviceName}] Publishing to ${feedKey} payload: ${mqttPayload}`,
              );
              publishToFeed(feedKey, mqttPayload); // Gửi MQTT

              // Cập nhật status mới vào DB
              try {
                await settingsRepository.updateSettingByName(deviceName, {
                  status: calculatedStatus,
                });
                console.log(
                  `[ScheduleCheck ${deviceName}] Updated database status to ${calculatedStatus}`,
                );
                try {
                  const notificationMessage = `Device '${deviceName}' was turned ${
                    calculatedStatus ? "ON" : "OFF"
                  } according to schedule.`;
                  await notificationService.createNotificationForAllUsers(
                    notificationMessage,
                    "SCHEDULE_CONTROL", // Loại thông báo
                    deviceName, // ID liên quan
                  );
                  console.log(
                    `[Notification] Created for ALL users - ${deviceName} schedule control`,
                  );
                } catch (notificationError) {
                  console.error(
                    `[Notification] Failed to create for ALL users - ${deviceName} schedule control:`,
                    notificationError,
                  );
                }
              } catch (dbError) {
                console.error(
                  `[ScheduleCheck ${deviceName}] Failed to update database status:`,
                  dbError,
                );
              }
            } else {
              console.warn(
                `[ScheduleCheck ${deviceName}] Could not determine MQTT payload.`,
              );
            }
          }
          // else {
          //    console.log(`[ScheduleCheck ${deviceName}] Status matches schedule. No change needed.`);
          // }
        } catch (error) {
          console.error(
            `[ScheduleCheck] Error during scheduled check for ${deviceName}:`,
            error,
          );
        }
      }
    }
    } finally {
      this.isAutomationRunning = false;

      if (this.hasPendingAutomationRun) {
        this.hasPendingAutomationRun = false;
        this.requestAutomationControl("pending");
      }
    }
  }

  async cleanupOldData() {
    try {
      console.log("[Cleanup] Starting old sensor data cleanup (keeping 5 days)...");
      const deletedCount = await sensorRepository.deleteOldData(5);
      console.log(`[Cleanup] Completed. Deleted ${deletedCount} records.`);
    } catch (error) {
      console.error("[Cleanup] Error during cleanup:", error);
    }
  }
}

const sensorService = new SensorService();

const FEEDS = ["humid", "light", "thermal", "pir"];

function startAutoSync() {
  setInterval(async () => {
    console.log("sensorService.js/Autosync: Auto-sync started...");

    for (const feedKey of FEEDS) {
      try {
        const result = await sensorService.syncFeed(feedKey);
        // console.log(`Synced feed: ${feedKey}`, result);
      } catch (error) {
        console.error(`Error syncing feed ${feedKey}:`, error);
      }
    }

    console.log("sensorService.js/Autosync: Auto-sync completed!");
  }, 20 * 1000);
}

function startControlCheck() {
  console.log("[ControlCheck] Starting periodic control checks(15s)...");
  setInterval(async () => {
    try {
      await sensorService.triggerAutomationControl();
    } catch (error) {
      console.error(
        "[ControlCheck] Error during periodic control check:",
        error,
      );
    }
  }, 20 * 1000);
}

function startCleanupTask() {
  console.log("[Cleanup] Starting periodic cleanup checks(Daily)...");
  // Run immediately on start
  sensorService.cleanupOldData();
  // Then run every 24 hours
  setInterval(async () => {
    await sensorService.cleanupOldData();
  }, 24 * 60 * 60 * 1000);
}

module.exports = {
  sensorService,
  saveSensorData: (feedName, value, timestamp) => sensorService.saveSensorData(feedName, value, timestamp),
  startAutoSync,
  startControlCheck,
  startCleanupTask,
};
