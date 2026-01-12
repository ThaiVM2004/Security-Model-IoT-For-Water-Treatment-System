const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Cấu hình Raspberry Pi
const RPI_URL = "http://192.168.1.115:8080";
const RPI_ENDPOINT = "/api/user-register";

/**
 * API nhận thông báo từ frontend và forward đến RPi
 * Frontend gọi sau khi đã ghi thành công vào Firebase
 */
app.post("/api/notify-rpi", async (req, res) => {
  try {
    const { action, data, username, role, uid, timestamp } = req.body;

    console.log("\n" + "=".repeat(50));
    console.log("Received registration notification:");
    console.log(`Data packet: ${data}`);
    console.log(`Username: ${username}, Role: ${role}`);
    console.log(`UID: ${uid}`);
    console.log("=".repeat(50) + "\n");

    // Gửi đến Raspberry Pi
    const rpiResponse = await axios.post(
      `${RPI_URL}${RPI_ENDPOINT}`,
      {
        action: action,
        data: data,
        username: username,
        role: role,
        uid: uid,
        timestamp: timestamp,
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Successfully sent to RPi:", rpiResponse.data);

    res.json({
      success: true,
      message: "Data sent to RPi successfully",
      rpiResponse: rpiResponse.data,
    });
  } catch (error) {
    console.error("Error forwarding to RPi:", error.message);

    // Vẫn trả về response để frontend không bị lỗi
    res.status(200).json({
      success: false,
      message: "Failed to send to RPi",
      error: error.message,
    });
  }
});

/**
 * API kiểm tra kết nối với RPi
 */
app.get("/api/check-rpi", async (req, res) => {
  try {
    const response = await axios.get(`${RPI_URL}/health`, { timeout: 3000 });
    res.json({
      status: "connected",
      rpiStatus: response.data,
    });
  } catch (error) {
    res.status(503).json({
      status: "disconnected",
      error: error.message,
    });
  }
});

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`RPi target: ${RPI_URL}${RPI_ENDPOINT}`);
  console.log("Ready to forward registration data to RPi...");
});