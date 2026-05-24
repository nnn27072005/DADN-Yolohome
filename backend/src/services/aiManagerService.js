const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

class AIManagerService {
  constructor() {
    this.pythonProcess = null;
    this.isRestarting = false;
    // Đường dẫn tới file Python
    this.scriptPath = path.join(__dirname, "..", "..", "..", "Face-recognition", "src", "aiot_gateway.py");
    // Lệnh python (Windows thường là 'python', Linux/Mac có thể là 'python3')
    this.pythonCommand = os.platform() === "win32" ? "python" : "python3";
  }

  start() {
    console.log(`[AIManager] Starting Face Recognition AI module...`);
    console.log(`[AIManager] Script path: ${this.scriptPath}`);

    this.pythonProcess = spawn(this.pythonCommand, [this.scriptPath], {
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, PYTHONUNBUFFERED: "1" }, // Đảm bảo log được đẩy ra ngay lập tức
    });

    this.pythonProcess.stdout.on("data", (data) => {
      console.log(`[AI-STDOUT] ${data.toString().trim()}`);
    });

    this.pythonProcess.stderr.on("data", (data) => {
      console.error(`[AI-STDERR] ${data.toString().trim()}`);
    });

    this.pythonProcess.on("close", (code) => {
      console.log(`[AIManager] AI process exited with code ${code}`);
      if (!this.isRestarting && code !== 0) {
        console.log("[AIManager] Attempting to restart in 5 seconds...");
        setTimeout(() => this.start(), 5000);
      }
    });

    this.pythonProcess.on("error", (err) => {
      console.error("[AIManager] Failed to start AI process:", err);
    });
  }

  stop() {
    if (this.pythonProcess) {
      this.isRestarting = true;
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}

module.exports = new AIManagerService();
