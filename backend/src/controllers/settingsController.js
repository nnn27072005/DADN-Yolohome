const settingsService = require('../services/settingsService');

const DOOR_AUTO_CLOSE_MS = Number(
    process.env.DOOR_AUTO_CLOSE_MS || 5 * 60 * 1000
);
let doorAutoCloseTimer = null;

function scheduleDoorAutoClose() {
    if (doorAutoCloseTimer) {
        clearTimeout(doorAutoCloseTimer);
    }

    doorAutoCloseTimer = setTimeout(async () => {
        doorAutoCloseTimer = null;
        try {
            console.log(`[DoorAuth] Auto-closing door after ${DOOR_AUTO_CLOSE_MS}ms...`);
            await settingsService.updateSettingByName("door", { status: false }, null);
        } catch (error) {
            console.error("[DoorAuth] Failed to auto-close door:", error);
        }
    }, DOOR_AUTO_CLOSE_MS);
}

class SettingsController {
    async getAllSettings(req, res) {
        try {
            const settings = await settingsService.getAllSettings();
            res.json(settings);
        } catch (error) {
            console.error("Error fetching settings:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async getSettingsByName(req, res) {
        try {
            const { name } = req.params;
            const settings = await settingsService.getSettingByName(name);
            if (!settings) {
                return res.status(404).json({ message: "Settings not found" });
            }
            res.json(settings);
        } catch (error) {
            console.error("Error fetching settings:", error);
            if (error.message === "Settings not found") {
              return res.status(404).json({ message: "Settings not found" });
            }
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    async updateSettingByName(req, res) {
        try {
            const { name } = req.params;
            const userId = req.user?.id; // lấy user id từ token
            const settingsData = req.body;
            const updatedSettings = await settingsService.updateSettingByName(name, settingsData, userId);
            if (!updatedSettings) {
                // console.log("THISSSS");
                return res.status(404).json({ message: "Settings not found" });
            }
            res.json(updatedSettings);
        } catch (error) {
            console.error("Error updating settings:", error);
            if (error.message === "Settings not found") {
              return res.status(404).json({ message: "Settings not found" });
            } else if (error.message === "Invalid or missing 'index'") {
              return res
                .status(400)
                .json({ message: "Invalid or missing 'index'" });
            } else if (error.code === "22007") {
              // Mã lỗi cho invalid datetime format
              let fieldName = "time field";
              if (error.message && error.message.includes("time")) {
                // Cố gắng đoán trường từ message lỗi
                fieldName = "turn_on_at or related time field";
              }
              return res
                .status(400)
                .json({
                  message: `Invalid format for ${fieldName}. Please use HH:MM or HH:MM:SS format.`,
                });
            }
            else if (error.message === "Invalid intensity value for fan or led") {
                return res.status(400).json({ message: "Invalid intensity value for fan or led" });
            }
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
    async updateSettingStatusByName(req, res) {
        try {
            const { name } = req.params;
            const userId = req.user?.id; // lấy user id từ token
            const updatedSettings = await settingsService.updateSettingStatusByName(name, userId);
            console.log("updatedSettings", updatedSettings);
            if (!updatedSettings) {
                return res.status(404).json({ message: "Settings not found" });
            }
            res.json(updatedSettings);
        } catch (error) {
            console.error("Error updating settings status:", error);
            if (error.message === "Settings not found") {
                return res.status(404).json({ message: "Settings not found" });
            }
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
    async requestDoorAuth(req, res) {
        try {
            const { publishToFeed } = require("../services/mqttpublisher");
            console.log("[DoorAuth] Requesting door authentication by publishing to PIR feed...");
            publishToFeed("pir", "1");
            res.json({ message: "Camera verification triggered successfully." });
        } catch (error) {
            console.error("Error triggering camera verification:", error);
            res.status(500).json({ error: "Failed to trigger camera verification" });
        }
    }

    async verifyDoorFrame(req, res) {
        try {
            const { imageBase64 } = req.body;
            if (!imageBase64) {
                return res.status(400).json({ error: "imageBase64 is required" });
            }

            const { classifyBase64Image } = require("../services/faceRecognitionService");
            const { publishToFeed } = require("../services/mqttpublisher");
            const { broadcast } = require("../services/webSocketService");

            const result = await classifyBase64Image(imageBase64);
            const resultIndex = Number(result.resultIndex);

            publishToFeed("ai-result", resultIndex);

            if (resultIndex === 0) {
                publishToFeed("door-control", "ON");
                await settingsService.updateSettingByName("door", { status: true }, req.user?.id);
                scheduleDoorAutoClose();
            } else if (resultIndex === 1) {
                publishToFeed("door-control", "OFF");
            }

            broadcast({
                type: "MQTT_MESSAGE",
                payload: { feed: "ai-result", value: String(resultIndex) },
            });

            res.json(result);
        } catch (error) {
            console.error("[DoorAuth] Error verifying frame:", error);
            res.status(500).json({ error: "Failed to verify camera frame", details: error.message });
        }
    }
}

module.exports = new SettingsController();
