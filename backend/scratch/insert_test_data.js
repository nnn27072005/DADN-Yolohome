const { pool } = require("../src/database/PostgreDatabase");

async function insertTestData() {
  try {
    const timestamp = new Date();
    
    // Insert thermal (temperature) = 0
    await pool.query(
      "INSERT INTO sensors (feed_name, value, timestamp) VALUES ($1, $2, $3)",
      ["thermal", "0", timestamp]
    );
    console.log("Inserted temperature = 0");

    // Insert light = 0
    await pool.query(
      "INSERT INTO sensors (feed_name, value, timestamp) VALUES ($1, $2, $3)",
      ["light", "0", timestamp]
    );
    console.log("Inserted light = 0");

    process.exit(0);
  } catch (err) {
    console.error("Error inserting test data:", err);
    process.exit(1);
  }
}

insertTestData();
