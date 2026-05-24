require("dotenv").config();
const { pool } = require("./src/database/PostgreDatabase");

async function checkNotifications() {
    try {
        console.log("--- Reminders (Detailed) ---");
        const reminders = await pool.query("SELECT id, user_id, index_name, last_triggered_at FROM reminders");
        console.table(reminders.rows);

        console.log("\n--- Latest Reminder Notifications ---");
        const notifications = await pool.query(`
            SELECT * FROM notifications 
            WHERE type = 'REMINDER_ALERT' 
            ORDER BY timestamp DESC 
            LIMIT 10
        `);
        console.table(notifications.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkNotifications();
