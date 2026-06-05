const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const scriptPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "Face-recognition",
  "src",
  "classify_image.py"
);
const pythonCommand = os.platform() === "win32" ? "python" : "python3";

function parseDataUrl(base64Image) {
  const match = /^data:image\/\w+;base64,(.+)$/.exec(base64Image);
  return match ? match[1] : base64Image;
}

function runClassifier(imagePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [scriptPath, imagePath], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Classifier exited with code ${code}: ${stderr || stdout}`)
        );
      }

      const jsonLine = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reverse()
        .find((line) => line.startsWith("{"));

      if (!jsonLine) {
        return reject(new Error(`Classifier did not return JSON: ${stdout}`));
      }

      const result = JSON.parse(jsonLine);
      if (result.error) {
        return reject(new Error(result.error));
      }
      resolve(result);
    });
  });
}

async function classifyBase64Image(base64Image) {
  const imageBuffer = Buffer.from(parseDataUrl(base64Image), "base64");
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "yolohome-face-"));
  const imagePath = path.join(tempDir, "frame.jpg");

  try {
    await fs.writeFile(imagePath, imageBuffer);
    return await runClassifier(imagePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  classifyBase64Image,
};
