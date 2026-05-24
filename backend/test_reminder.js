require("dotenv").config();
const notificationService = require("./src/services/NotificationService");

async function testReminderTrigger() {
    try {
        console.log("Running checkAndTriggerReminders manually...");
        await notificationService.checkAndTriggerReminders();
        console.log("Finished running checkAndTriggerReminders.");
        
        // Check if notification was created
        const { pool } = require("./src/database/PostgreDatabase");
        const notifications = await pool.query(`
            SELECT * FROM notifications 
            WHERE type = 'REMINDER_ALERT' 
            ORDER BY timestamp DESC 
            LIMIT 5
        `);
        console.log("Recent notifications:");
        console.table(notifications.rows);
        
        process.exit(0);
    } catch (error) {
        console.error("Error in test script:", error);
        process.exit(1);
    }
}

testReminderTrigger();
