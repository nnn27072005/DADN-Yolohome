const { sensorService } = require("../src/services/sensorService");
const notificationService = require("../src/services/NotificationService");
const settingsService = require("../src/services/settingsService");
const { pool } = require("../src/database/PostgreDatabase");

async function testNotifications() {
  try {
    const userId = 1; // Assuming user_id 1 exists from previous logs

    console.log("--- Testing Mode Change Notification ---");
    await settingsService.updateSettingByName("fan", { mode: "manual" }, userId);
    await settingsService.updateSettingByName("fan", { mode: "automatic" }, userId);

    console.log("--- Testing Status Change Notification ---");
    await settingsService.updateSettingByName("led", { status: true }, userId);
    await settingsService.updateSettingByName("led", { status: false }, userId);

    console.log("--- Testing Intensity Change Notification ---");
    await settingsService.updateSettingByName("led", { status: true, intensity: 50 }, userId);
    await settingsService.updateSettingByName("led", { status: true, intensity: 80 }, userId);

    console.log("--- Testing Threshold Notification ---");
    // 1. Create a reminder
    await pool.query(
      "INSERT INTO reminders (user_id, index_name, higher_than_status, higher_than_value, active) VALUES ($1, $2, $3, $4, $5)",
      [userId, "temperature", true, 30, true]
    );
    // 2. Insert sensor data > 30
    await pool.query(
      "INSERT INTO sensors (feed_name, value, timestamp) VALUES ($1, $2, $3)",
      ["thermal", "35", new Date()]
    );
    // 3. Trigger check
    await notificationService.checkAndTriggerReminders();

    console.log("--- Fetching Latest 10 Notifications ---");
    const res = await pool.query("SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 10");
    console.log(JSON.stringify(res.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testNotifications();
