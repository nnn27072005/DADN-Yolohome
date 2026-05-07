const { sensorService } = require("../src/services/sensorService");
const dotenv = require("dotenv");
dotenv.config();

async function test() {
  const date = "2026-05-06";
  try {
    const data = await sensorService.getDailyDashboardData(date);
    console.log("Dashboard Data for", date);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
