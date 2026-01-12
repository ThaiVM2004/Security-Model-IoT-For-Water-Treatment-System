import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, set } from "firebase/database";
import { collection, addDoc } from "firebase/firestore";
import "./Water_Level.css";

const WaterLevel = ({ db_rt, db, username, userInfo }) => {
  const [waterLevel, setWaterLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [auto1Status, setAuto1Status] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [pump1Status, setPump1Status] = useState(false);
  const [valve1Status, setValve1Status] = useState(false);

  const systemRunningRef = useRef(false);
  const isInternalUpdate = useRef(false);

  // ✅ HÀM GỬI LỆNH ĐẾN FIRESTORE
  const sendCommandToTerminal = async (device, action) => {
    try {
      const command = `db/${userInfo.username}/${userInfo.role}/${device}/${action}`;
      
      await addDoc(collection(db, "terminal_commands"), {
        command: command,
        type: "input",
        timestamp: new Date().toLocaleString("vi-VN"),
        user: userInfo.username,
        device: device,
        action: action,
        role: userInfo.role,
        processed: false,
      });

      console.log(`✅ Command sent to terminal: ${device} -> ${action}`);
    } catch (error) {
      console.error("❌ Error sending command to Firestore:", error);
    }
  };

  // Lắng nghe water level
  useEffect(() => {
    if (!username || username === "guest") {
      setLoading(false);
      return;
    }

    const waterLevelRef = ref(db_rt, "user1/water_level/current");

    const unsubscribe = onValue(
      waterLevelRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const level = snapshot.val();
          const normalizedLevel = Math.max(
            0,
            Math.min(100, Number(level) || 0)
          );
          setWaterLevel(normalizedLevel);
          setLoading(false);
        } else {
          setWaterLevel(0);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error reading water level:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db_rt, username]);

  // Lắng nghe auto1 status
  useEffect(() => {
    if (!username || username === "guest") return;

    const auto1Ref = ref(db_rt, "user1/auto1");

    const unsubscribe = onValue(auto1Ref, (snapshot) => {
      if (snapshot.exists()) {
        const status = snapshot.val();
        setAuto1Status(status === "on" || status === true);
      }
    });

    return () => unsubscribe();
  }, [db_rt, username]);

  // ✅ Lắng nghe pump1 - CHỈ ĐỂ SYNC UI, KHÔNG GỬI COMMAND
  useEffect(() => {
    if (!username || username === "guest") return;

    const pump1Ref = ref(db_rt, "user1/pump1");
    let isFirstLoad = true;

    const unsubscribe = onValue(pump1Ref, (snapshot) => {
      if (snapshot.exists()) {
        const status = snapshot.val();
        const newStatus = status === "on" || status === true;

        // ✅ CHỈ CẬP NHẬT STATE, KHÔNG GỬI COMMAND
        // (Vì command đã được gửi từ controlDevice rồi)
        setPump1Status(newStatus);
        
        if (!isFirstLoad) {
          console.log(`🔔 Pump1 status changed to: ${newStatus ? "ON" : "OFF"}`);
        }
        
        isFirstLoad = false;
      }
    });

    return () => unsubscribe();
  }, [db_rt, username]);

  // ✅ Lắng nghe valve1 - CHỈ ĐỂ SYNC UI, KHÔNG GỬI COMMAND
  useEffect(() => {
    if (!username || username === "guest") return;

    const valve1Ref = ref(db_rt, "user1/valve1");
    let isFirstLoad = true;

    const unsubscribe = onValue(valve1Ref, (snapshot) => {
      if (snapshot.exists()) {
        const status = snapshot.val();
        const newStatus = status === "on" || status === true;

        // ✅ CHỈ CẬP NHẬT STATE, KHÔNG GỬI COMMAND
        setValve1Status(newStatus);
        
        if (!isFirstLoad) {
          console.log(`🔔 Valve1 status changed to: ${newStatus ? "ON" : "OFF"}`);
        }
        
        isFirstLoad = false;
      }
    });

    return () => unsubscribe();
  }, [db_rt, username]);

  // ✅ HÀM ĐIỀU KHIỂN THIẾT BỊ - CHỈ GỬI COMMAND 1 LẦN
  const controlDevice = async (devicePath, value) => {
    try {
      const deviceName = devicePath.split("/").pop();

      // ✅ GỬI COMMAND ĐẾN TERMINAL (CHỈ 1 LẦN)
      if (db && userInfo) {
        await sendCommandToTerminal(deviceName, value);
      }

      // ✅ UPDATE REALTIME DATABASE (useEffect sẽ tự động sync UI)
      const deviceRef = ref(db_rt, devicePath);
      await set(deviceRef, value);

      console.log(`✅ ${devicePath} set to ${value}`);
    } catch (error) {
      console.error(`❌ Error controlling ${devicePath}:`, error);
    }
  };

  const delay = (seconds) =>
    new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  // ✅ Khởi động hệ thống
  const startSystem = async () => {
    if (isProcessing || systemRunningRef.current) return;

    setIsProcessing(true);
    systemRunningRef.current = true;

    try {
      console.log("🟢 Bắt đầu bơm nước - Mức nước >= 70%");

      console.log("🔂 Mở van (valve1)...");
      await controlDevice("user1/valve1", "on");

      console.log("⏳ Đợi 3 giây...");
      await delay(5);

      console.log("💧 Bật máy bơm (pump1)...");
      await controlDevice("user1/pump1", "on");

      console.log("✅ Hệ thống đã khởi động hoàn tất!");
    } catch (error) {
      console.error("❌ Lỗi khi khởi động hệ thống:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Dừng hệ thống
  const stopSystem = async () => {
    if (isProcessing || !systemRunningRef.current) return;

    setIsProcessing(true);

    try {
      console.log("🔴 Dừng bơm nước - Mức nước <= 30%");

      console.log("💧 Tắt máy bơm (pump1)...");
      await controlDevice("user1/pump1", "off");

      console.log("⏳ Đợi 3 giây...");
      await delay(3);

      console.log("🔂 Đóng van (valve1)...");
      await controlDevice("user1/valve1", "off");

      console.log("✅ Hệ thống đã tắt hoàn tất");
      systemRunningRef.current = false;
    } catch (error) {
      console.error("❌ Lỗi khi tắt hệ thống:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Logic tự động điều khiển
  useEffect(() => {
    if (!auto1Status || loading) return;

    if (waterLevel >= 70 && !systemRunningRef.current && !isProcessing) {
      startSystem();
    }

    if (waterLevel <= 30 && systemRunningRef.current && !isProcessing) {
      stopSystem();
    }
  }, [waterLevel, auto1Status, loading]);

  const getWaterColor = (level) => {
    if (level < 20) return "danger";
    if (level < 40) return "normal";
    if (level < 70) return "normal";
    return "high";
  };

  const colorClass = getWaterColor(waterLevel);

  return (
    <div className="water-level-wrapper">
      <div className="water-level-label">WATER LEVEL</div>

      <div className="water-container">
        <div className="water-marks">
          {[0, 25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="water-mark"
              style={{ bottom: `${mark}%` }}
            >
              <span className="water-mark-text">{mark}</span>
            </div>
          ))}
        </div>

        <div
          className={`water-fill ${colorClass}`}
          style={{ height: `${waterLevel}%` }}
        >
          <div className="wave wave1"></div>
          <div className="wave wave2"></div>

          {waterLevel > 0 &&
            [1, 2, 3].map((bubble) => (
              <div
                key={bubble}
                className={`bubble bubble${bubble}`}
                style={{
                  left: `${20 + bubble * 25}%`,
                  width: `${6 + bubble * 2}px`,
                  height: `${6 + bubble * 2}px`,
                  animationDelay: `${bubble * 0.5}s`,
                }}
              />
            ))}

          <div className="water-shimmer"></div>
        </div>
      </div>

      <div className={`water-percentage ${colorClass}`}>
        {loading ? "--" : waterLevel}%
      </div>
    </div>
  );
};

export default WaterLevel;
