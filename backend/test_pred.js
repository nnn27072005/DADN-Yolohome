const path = require("path");
const { getPrediction } = require("./src/YolohomeModel/prediction.js");

async function test() {
    try {
        console.log("Testing FAN...");
        const fanInput = { temperature: 29.0, humidity: 94.4 };
        const fanRes = await getPrediction("fan", fanInput);
        console.log("FAN result:", fanRes, "Length:", fanRes.length, "Hex:", Buffer.from(fanRes).toString('hex'));
        console.log("Is BẬT?", fanRes === "BẬT");

        console.log("Testing LED...");
        const ledInput = { Light_Intensity: 369.1, Temperature: 29.0, Humidity: 94.4, Minute_Of_Day: 953 };
        const ledRes = await getPrediction("led", ledInput);
        console.log("LED result:", ledRes, "Is 1?", ledRes === "1", "Is 0?", ledRes === "0");
    } catch (e) {
        console.error(e);
    }
}
test();
