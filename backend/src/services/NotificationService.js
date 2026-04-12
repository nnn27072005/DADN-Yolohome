const notificationRepository = require("../repository/NotificationRepository");
const reminderRepository = require("../repository/reminderRepository");
const settingsRepository = require("../repository/settingsRepository");
const { publishToFeed } = require("./mqttpublisher");

class NotificationService {
  async createNotification(userId, message, type, related_entity_id = "") {
    if (!userId || !message || !type) {
      throw new Error("Missing required parameters for creating notification");
    }
    try {
      const notification = await notificationRepository.create(
        userId,
        message,
        type,
        false,
        related_entity_id
      );
      return notification;
    } catch (error) {
      console.error("Error in NotificationService.createNotification:", error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  async getNotificationsForUser(userId) {
    if (!userId) {
      throw new Error("User ID is required to get notifications.");
    }
    try {
      return await notificationRepository.findByUserId(userId);
    } catch (error) {
      console.error(
        "Error in NotificationService.getNotificationsForUser:",
        error
      );
      throw new Error(`Failed to retrieve notifications: ${error.message}`);
    }
  }

  async markNotificationAsRead(userId, notificationId) {
    if (!userId || !notificationId) {
      throw new Error("User ID and Notification ID are required.");
    }
    try {
      const updatedNotification = await notificationRepository.markAsRead(
        userId,
        notificationId
      );
      if (!updatedNotification) {
        console.warn(
          `Notification ${notificationId} not found for user ${userId} or already read.`
        );
        return null;
      }
      return updatedNotification;
    } catch (error) {
      console.error(
        "Error in NotificationService.markNotificationAsRead:",
        error
      );
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  async markAllNotificationsAsRead(userId) {
    if (!userId) {
      throw new Error("User ID is required.");
    }
    try {
      const count = await notificationRepository.markAllAsRead(userId);
      return count;
    } catch (error) {
      console.error(
        "Error in NotificationService.markAllNotificationsAsRead:",
        error
      );
      throw new Error(
        `Failed to mark all notifications as read: ${error.message}`
      );
    }
  }

  async checkAndTriggerReminders() {
    // Import inside to avoid circular dependency
    const settingsService = require("./settingsService");
    const { sensorService } = require("./sensorService");

    try {
      console.log("[ReminderCheck] Checking for reminder triggers...");
      const activeReminders = await reminderRepository.getActiveReminders();
      if (!activeReminders || activeReminders.length === 0) {
        console.log("[ReminderCheck] No active reminders found.");
        return;
      }

      const latestSensorData =
        await sensorService.getLatestSensorDataForAllFeeds();
      if (!latestSensorData || Object.keys(latestSensorData).length === 0) {
        console.warn(
          "[ReminderCheck] No sensor data available to check reminders."
        );
        return;
      }

      const mappedSensorData = {
        temperature: latestSensorData.thermal,
        humidity: latestSensorData.humid,
        soil_moisture: latestSensorData["earth-humid"],
        light: latestSensorData.light,
        thermal: latestSensorData.thermal, // Unified mapping for thermal
      };

      for (const reminder of activeReminders) {
        const sensorValueStr = mappedSensorData[reminder.index_name];

        if (sensorValueStr === undefined || sensorValueStr === null) {
          continue;
        }
        const sensorValue = parseFloat(sensorValueStr);
        if (isNaN(sensorValue)) {
          continue;
        }

        let isViolation = false;
        let thresholdType = ""; // "higher" or "lower"
        let thresholdValue = 0;

        if (
          reminder.higher_than_status &&
          sensorValue > parseFloat(reminder.higher_than_value)
        ) {
          isViolation = true;
          thresholdType = "higher";
          thresholdValue = parseFloat(reminder.higher_than_value);
        } else if (
          reminder.lower_than_status &&
          sensorValue < parseFloat(reminder.lower_than_value)
        ) {
          isViolation = true;
          thresholdType = "lower";
          thresholdValue = parseFloat(reminder.lower_than_value);
        }

        if (isViolation) {
          // --- Logic for 1-minute auto-action ---
          if (!reminder.last_violation_start) {
            await reminderRepository.updateViolationStart(reminder.id);
          } else {
            const violationStartTime = new Date(reminder.last_violation_start);
            const now = new Date();
            const violationDurationSec = (now - violationStartTime) / 1000;

            console.log(
              `[ReminderCheck] Violation duration for ${reminder.index_name}: ${violationDurationSec}s`
            );

            if (violationDurationSec >= 60 && reminder.auto_action && reminder.related_device) {
              console.log(
                `[AutoAction] Triggering auto-action for ${reminder.related_device} due to ${reminder.index_name} violation.`
              );

              try {
                const deviceName = reminder.related_device;
                const currentSettings = await settingsRepository.getSettingsByName(deviceName);

                if (currentSettings && currentSettings.status) {
                  const ratio = thresholdValue / sensorValue;
                  let newIntensity = Math.round(currentSettings.intensity * ratio);
                  let autoActionMessage = "";

                  // If intensity reduction is too much or device doesn't support it well, turn OFF
                  if (newIntensity < 10 || ["fan", "pump"].includes(deviceName) || deviceName === "led") {
                    await settingsRepository.updateSettingByName(deviceName, { status: false });
                    autoActionMessage = `Thiết bị '${deviceName === "fan" ? "Quạt" : deviceName === "led" ? "Đèn RGB" : "Bơm"}' đã tự động TẮT sau 1 phút vượt ngưỡng liên tục.`;
                  } else {
                    await settingsRepository.updateSettingByName(deviceName, { intensity: newIntensity });
                    autoActionMessage = `Cường độ thiết bị '${deviceName === "fan" ? "Quạt" : deviceName === "led" ? "Đèn RGB" : "Bơm"}' đã giảm xuống ${newIntensity}% sau 1 phút vượt ngưỡng liên tục.`;
                  }

                  // Execute via MQTT
                  const updatedSettings = await settingsRepository.getSettingsByName(deviceName);
                  const feedKey = settingsService.getFeedKey(deviceName);
                  const payload = settingsService.determineMQttPayload(deviceName, updatedSettings);
                  if (feedKey && payload !== null) {
                    publishToFeed(feedKey, payload);
                  }

                  // Notify
                  await this.createNotification(reminder.user_id, autoActionMessage, "AUTO_ACTION", deviceName);
                  // Reset violation start to avoid repeated triggers in the same cycle
                  await reminderRepository.resetViolationStart(reminder.id);
                  console.log(`[AutoAction] Executed: ${autoActionMessage}`);
                }
              } catch (actionError) {
                console.error("[AutoAction] Error executing auto-action:", actionError);
              }
            }
          }

          // --- Standard Notification (Repeat logic) ---
          const message = `Cảnh báo: ${reminder.index_name === "temperature" ? "Nhiệt độ" : "Cường độ ánh sáng"} (${sensorValue}${reminder.index_name === "temperature" ? "°C" : "lux"}) đang ${thresholdType === "higher" ? "cao" : "thấp"} hơn ngưỡng ${thresholdValue}.`;
          const now = new Date();
          let shouldNotify = false;

          if (!reminder.last_triggered_at) {
            shouldNotify = true;
          } else if (reminder.repeat_after_status && reminder.repeat_after_value > 0) {
            const lastTriggeredTime = new Date(reminder.last_triggered_at);
            const diffMinutes = (now.getTime() - lastTriggeredTime.getTime()) / (1000 * 60);
            if (diffMinutes >= reminder.repeat_after_value) {
              shouldNotify = true;
            }
          }

          if (shouldNotify) {
            await this.createNotification(reminder.user_id, message, "REMINDER_ALERT", reminder.index_name);
            await reminderRepository.updateReminderLastTriggered(reminder.id);
          }
        } else {
          // No violation -> reset the timer
          if (reminder.last_violation_start) {
            await reminderRepository.resetViolationStart(reminder.id);
          }
        }
      }
    } catch (error) {
      console.error("[ReminderCheck] Error during reminder check:", error);
    }
  }
}

module.exports = new NotificationService();
