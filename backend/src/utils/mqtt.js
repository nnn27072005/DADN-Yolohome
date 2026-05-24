const mqtt = require("mqtt");
require("dotenv").config();

const client = mqtt.connect("mqtt://io.adafruit.com", {
  username: process.env.ADAFRUIT_IO_USERNAME,
  password: process.env.ADAFRUIT_IO_KEY,
});

client.on("connect", () => {
  console.log("✅ MQTT connected to Adafruit IO");

  const feeds = ["fan", "light-control", "pir", "door-control", "ai-result"];

  feeds.forEach((feed) => {
    const topic = `${process.env.ADAFRUIT_IO_USERNAME}/feeds/${feed}`;
    client.subscribe(topic, (err) => {
      if (!err) {
        console.log(`📥 Subscribed to ${topic}`);
      } else {
        console.error(`❌ Failed to subscribe ${topic}:`, err);
      }
    });
  });
});

client.on("message", async (topic, message) => {
  const payload = message.toString();
  console.log(`📨 ${topic}: ${payload}`);

  const feedKey = topic.split("/").pop();

  // Xử lý logic tại đây
  try {
    const { broadcast } = require("../services/webSocketService");
    const notificationService = require("../services/NotificationService");
    const sensorService = require("../services/sensorService");

    if (feedKey === "pir") {
      console.log(`🚶 PIR state: ${payload}`);
      await sensorService.saveSensorData("pir", payload);
    } else if (feedKey === "ai-result") {
      await sensorService.saveSensorData("ai-result", payload);
      const resultIndex = parseInt(payload);
      if (resultIndex === 1) {
        console.warn("🚨 STRANGER DETECTED!");
        // Tạo thông báo cho tất cả người dùng (hoặc admin)
        await notificationService.createNotificationForAllUsers(
          "Cảnh báo: Có người lạ xuất hiện trước cửa!",
          "SECURITY_ALERT",
          "ai-camera"
        );
      } else if (resultIndex === 0) {
        console.log("🏠 Owner detected. Opening the door...");
        const settingsService = require("../services/settingsService");
        await settingsService.updateSettingByName("door", { status: true }, null);
      }
    }

    // Broadcast update to frontend
    broadcast({
      type: "MQTT_MESSAGE",
      payload: { feed: feedKey, value: payload },
    });
  } catch (error) {
    console.error("Error handling MQTT message:", error);
  }
});

client.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
});

module.exports = client;
