import React, { useState, useEffect } from "react";
import {
  Power,
  Lightbulb,
  Wind,
  Droplet,
  Settings,
  AlertOctagon,
  RefreshCw,
  Activity,
  Thermometer,
  Gauge,
  Zap,
  Fan,
  Users,
} from "lucide-react";
import "./Control.css";

import bulbIcon from "../Components/Assets/icon-bulb.jpg";
import pumpIcon from "../Components/Assets/icon-pump.jpg";
import valveIcon from "../Components/Assets/icon-valve.jpg";
import fanIcon from "../Components/Assets/fan-industrial.png";
import { auth, db_rt, db } from "../firebase/firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { ref, set, onValue } from "firebase/database";

const ControlCenter = ({
  collectionTemp,
  collectionTurbidity,
  collectionLevel,
  dischargeTemp,
  dischargeTurbidity,
  dischargePH,
  dischargeLevel,
}) => {
  const [userInfo, setUserInfo] = useState({
    email: "",
    role: "admin",
    username: "guest",
  });

  const [activeTab, setActiveTab] = useState("collection");

  const [user1Bulb, setUser1Bulb] = useState(false);
  const [user1Fan, setUser1Fan] = useState(false);
  const [user1Pump, setUser1Pump] = useState(false);
  const [user1Valve, setUser1Valve] = useState(false);
  const [user1Stop, setUser1Stop] = useState(false);
  const [user1Auto, setUser1Auto] = useState(false);

  const [user2Bulb, setUser2Bulb] = useState(false);
  const [user2Fan, setUser2Fan] = useState(false);
  const [user2Pump, setUser2Pump] = useState(false);
  const [user2Valve, setUser2Valve] = useState(false);
  const [user2Stop, setUser2Stop] = useState(false);
  const [user2Auto, setUser2Auto] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserInfo({
              email: user.email || "",
              role: userData.role || "user",
              username:
                userData.username || user.email?.split("@")[0] || "user",
            });
          } else {
            setUserInfo({
              email: user.email || "",
              role: "user",
              username: user.email?.split("@")[0] || "user",
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserInfo({
            email: user.email || "",
            role: "user",
            username: user.email?.split("@")[0] || "user",
          });
        }
      } else {
        setUserInfo({
          email: "",
          role: "user",
          username: "guest",
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Gửi lệnh đến terminal
  const sendCommandToTerminal = async (device, action, userPath) => {
    try {
      const command = `db/${"thai_admin"}/admin/${device}/${action}`;

      // Chọn collection dựa trên userPath
      const collectionName =
        userPath === "user1" ? "terminal_commands" : "terminal_commands_2";

      await addDoc(collection(db, collectionName), {
        command: command,
        type: "input",
        timestamp: new Date().toLocaleString("vi-VN"),
        user: userPath,
        device: device,
        action: action,
        role: "admin",
        processed: false,
      });


      setTimeout(async () => {
        const status = Math.random() > 0.1 ? "success" : "error";
        const responseMsg =
          status === "success"
            ? `Device ${device} (${userPath}) turned ${action.toUpperCase()} successfully`
            : `Failed to control ${device} (${userPath})`;
        console.log(responseMsg);
      }, 500);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };

  // Lắng nghe trạng thái thiết bị User1 (Collection Tank) từ Firebase Realtime Database
  useEffect(() => {
    const devicesUser1 = [
      { name: "bulb1", setState: setUser1Bulb },
      { name: "fan_industrial1", setState: setUser1Fan },
      { name: "pump1", setState: setUser1Pump },
      { name: "valve1", setState: setUser1Valve },
      { name: "stop1", setState: setUser1Stop },
      { name: "auto1", setState: setUser1Auto },
    ];

    const unsubscribes = devicesUser1.map((device) => {
      const deviceRef = ref(db_rt, `user1/${device.name}`);

      return onValue(
        deviceRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const status = snapshot.val();
            const isOn = status === "on";
            device.setState(isOn);
          } else {
            device.setState(false);
          }
        },
        (error) => {
          console.error(`Error with user1/${device.name}:`, error);
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  // Lắng nghe trạng thái thiết bị User2 (Discharge Tank) - BỎ FAN
  useEffect(() => {
    const devicesUser2 = [
      { name: "bulb2", setState: setUser2Bulb },
      { name: "pump2", setState: setUser2Pump },
      { name: "valve2", setState: setUser2Valve },
      { name: "stop2", setState: setUser2Stop },
      { name: "auto2", setState: setUser2Auto },
    ];

    const unsubscribes = devicesUser2.map((device) => {
      const deviceRef = ref(db_rt, `user2/${device.name}`);

      return onValue(
        deviceRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const status = snapshot.val();
            const isOn = status === "on";
            device.setState(isOn);
          } else {
            device.setState(false);
          }
        },
        (error) => {
          console.error(`Error with user2/${device.name}:`, error);
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  // Xử lý bật/tắt thiết bị
  const handleDeviceToggle = async (
    deviceNumber,
    deviceName,
    currentState,
    setState,
    userPath,
    isAutoMode
  ) => {
    const newState = !currentState;
    setState(newState);

    const action = newState ? "on" : "off";
    await sendCommandToTerminal(deviceName, action, userPath);

    if (!userInfo.username || userInfo.username === "guest") {
      console.error("User not logged in - Firebase not updated");
      return;
    }

    try {
      const deviceRef = ref(db_rt, `${userPath}/${deviceName}`);
      await set(deviceRef, action);

      // Xử lý logic Auto Mode
      if ((deviceName === "auto1" || deviceName === "auto2") && action === "on") {
        // Chọn thiết bị dựa trên userPath - User2 KHÔNG CÓ FAN
        const allDevices = userPath === "user1"
          ? ["bulb1", "air_conditioner1", "pump1", "valve1", "fan_industrial1"]
          : ["bulb2", "air_conditioner2", "pump2", "valve2"];

        for (let dev of allDevices) {
          const refDev = ref(db_rt, `${userPath}/${dev}`);
          await set(refDev, "off");
          await sendCommandToTerminal(dev, "off", userPath);
        }

        // Tắt tất cả thiết bị của user tương ứng
        if (userPath === "user1") {
          setUser1Bulb(false);
          setUser1Fan(false);
          setUser1Pump(false);
          setUser1Valve(false);
        } else {
          setUser2Bulb(false);
          setUser2Pump(false);
          setUser2Valve(false);
        }

        console.log(`Auto mode activated for ${userPath} - all devices turned off`);
      }

      // Xử lý logic Emergency Stop
      if ((deviceName === "stop1" || deviceName === "stop2") && action === "on") {
        // Chọn thiết bị dựa trên userPath - User2 KHÔNG CÓ FAN
        const allDevices = userPath === "user1"
          ? ["bulb1", "air_conditioner1", "pump1", "valve1", "fan_industrial1"]
          : ["bulb2", "air_conditioner2", "pump2", "valve2"];

        for (let dev of allDevices) {
          const refDev = ref(db_rt, `${userPath}/${dev}`);
          await set(refDev, "off");
          await sendCommandToTerminal(dev, "off", userPath);
        }

        // Tắt tất cả thiết bị của user tương ứng
        if (userPath === "user1") {
          setUser1Bulb(false);
          setUser1Fan(false);
          setUser1Pump(false);
          setUser1Valve(false);
          // Tắt auto mode
          const autoRef = ref(db_rt, `user1/auto1`);
          await set(autoRef, "off");
          setUser1Auto(false);
        } else {
          setUser2Bulb(false);
          setUser2Pump(false);
          setUser2Valve(false);
          // Tắt auto mode
          const autoRef = ref(db_rt, `user2/auto2`);
          await set(autoRef, "off");
          setUser2Auto(false);
        }

        console.log(`Emergency stop activated for ${userPath} - all devices turned off`);

        // Tự động tắt nút stop sau 2 giây
        setTimeout(async () => {
          const stopRef = ref(db_rt, `${userPath}/${deviceName}`);
          await set(stopRef, "off");
          setState(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating Firebase:", error);
    }
  };

  // Xử lý Stop All trong từng tank
  const handleStopAll = async (userPath) => {
    // Chọn thiết bị dựa trên userPath - User2 KHÔNG CÓ FAN
    const allDevices = userPath === "user1"
      ? ["bulb1", "pump1", "valve1", "fan_industrial1"]
      : ["bulb2", "pump2", "valve2"];

    try {
      for (let dev of allDevices) {
        const refDev = ref(db_rt, `${userPath}/${dev}`);
        await set(refDev, "off");
        await sendCommandToTerminal(dev, "off", userPath);
      }

      // Tắt tất cả thiết bị của user tương ứng
      if (userPath === "user1") {
        setUser1Bulb(false);
        setUser1Fan(false);
        setUser1Pump(false);
        setUser1Valve(false);
      } else {
        setUser2Bulb(false);
        setUser2Pump(false);
        setUser2Valve(false);
      }

      console.log(`All devices in ${userPath} stopped`);
    } catch (error) {
      console.error("Error stopping all devices:", error);
    }
  };

  // Render nội dung tab
  const renderTabContent = () => {
    const isCollection = activeTab === "collection";
    const tankName = isCollection ? "Collection" : "Discharge";
    const tankId = isCollection ? "CT-001" : "DT-001";
    const userPath = isCollection ? "user1" : "user2";

    // Dữ liệu cảm biến hiện tại
    const temp = isCollection ? collectionTemp : dischargeTemp;
    const turbidity = isCollection ? collectionTurbidity : dischargeTurbidity;
    const ph = isCollection ? "N/A" : dischargePH;
    const level = isCollection ? collectionLevel : dischargeLevel;

    // Lấy states theo tank hiện tại
    const bulbState = isCollection ? user1Bulb : user2Bulb;
    const fanState = isCollection ? user1Fan : user2Fan;
    const pumpState = isCollection ? user1Pump : user2Pump;
    const valveState = isCollection ? user1Valve : user2Valve;
    const stopState = isCollection ? user1Stop : user2Stop;
    const autoState = isCollection ? user1Auto : user2Auto;

    const setBulb = isCollection ? setUser1Bulb : setUser2Bulb;
    const setFan = isCollection ? setUser1Fan : setUser2Fan;
    const setPump = isCollection ? setUser1Pump : setUser2Pump;
    const setValve = isCollection ? setUser1Valve : setUser2Valve;
    const setStop = isCollection ? setUser1Stop : setUser2Stop;
    const setAuto = isCollection ? setUser1Auto : setUser2Auto;

    // Tên thiết bị dựa trên userPath
    const deviceNames = {
      bulb: isCollection ? "bulb1" : "bulb2",
      fan: isCollection ? "fan_industrial1" : "fan_industrial2",
      pump: isCollection ? "pump1" : "pump2",
      valve: isCollection ? "valve1" : "valve2",
    };

    return (
      <div className="tab-content">
        {/* Warning Banner */}
        {(stopState || autoState) && (
          <div className="control-warning-banner">
            <AlertOctagon size={24} />
            <div>
              <h3>
                {stopState ? "Emergency Stop Active" : "Auto Mode Active"}
              </h3>
              <p>
                {stopState
                  ? `All devices in ${tankName} Tank have been stopped for safety`
                  : `${tankName} Tank is running in automatic mode - manual controls disabled`}
              </p>
            </div>
          </div>
        )}

        {/* Tank Header */}
        <div className="tank-header">
          <div className="tank-title">
            <Droplet size={24} className="tank-icon" />
            <div>
              <h3>{tankName} Tank Controls</h3>
              <p className="tank-id">
                ID: {tankId} | Path: {userPath}
              </p>
            </div>
          </div>
          <div className={`tank-status-badge status-active`}>
            <Activity size={16} />
            <span>ACTIVE</span>
          </div>
        </div>

        {/* Current Readings */}
        <div className="readings-grid">
          <div className="reading-card">
            <Thermometer size={20} />
            <div className="reading-info">
              <span className="reading-label">Temperature</span>
              <span className="reading-value">
                {temp?.toFixed(1) || "0.0"}°C
              </span>
            </div>
          </div>
          <div className="reading-card">
            <Gauge size={20} />
            <div className="reading-info">
              <span className="reading-label">Turbidity</span>
              <span className="reading-value">
                {turbidity?.toFixed(2) || "0.00"} NTU
              </span>
            </div>
          </div>
          <div className="reading-card">
            <Activity size={20} />
            <div className="reading-info">
              <span className="reading-label">pH Level</span>
              <span className="reading-value">
                {ph !== "N/A" ? ph?.toFixed(1) : "N/A"}
              </span>
            </div>
          </div>
          <div className="reading-card">
            <Droplet size={20} />
            <div className="reading-info">
              <span className="reading-label">Water Level</span>
              <span className="reading-value">{level?.toFixed(0) || "0"}%</span>
            </div>
          </div>
        </div>

        {/* Device Controls */}
        <div className="devices-section">
          <h4 className="section-title">Device Controls</h4>
          <div className="devices-grid">
            {/* Light Bulb */}
            <div
              className={`device-card ${
                bulbState ? "device-active" : "device-inactive"
              }`}
            >
              <div className="device-icon-container">
                <img src={bulbIcon} alt="Bulb" className="device-image" />
              </div>
              <div className="device-info">
                <h5 className="device-name">Light System</h5>
                <span
                  className={`device-status ${
                    bulbState ? "status-on" : "status-off"
                  }`}
                >
                  {bulbState ? "ON" : "OFF"}
                </span>
              </div>
              <button
                className={`device-toggle-btn ${
                  bulbState ? "btn-stop" : "btn-start"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    1,
                    deviceNames.bulb,
                    bulbState,
                    setBulb,
                    userPath,
                    autoState
                  )
                }
                disabled={autoState}
              >
                <Power size={16} />
                {bulbState ? "Turn Off" : "Turn On"}
              </button>
            </div>

            {/* Industrial Fan - CHỈ HIỂN THỊ CHO USER1 */}
            {isCollection && (
              <div
                className={`device-card ${
                  fanState ? "device-active" : "device-inactive"
                }`}
              >
                <div className="device-icon-container">
                  <img src={fanIcon} alt="Fan" className="device-image" />
                </div>
                <div className="device-info">
                  <h5 className="device-name">Ventilation Fan</h5>
                  <span
                    className={`device-status ${
                      fanState ? "status-on" : "status-off"
                    }`}
                  >
                    {fanState ? "ON" : "OFF"}
                  </span>
                </div>
                <button
                  className={`device-toggle-btn ${
                    fanState ? "btn-stop" : "btn-start"
                  }`}
                  onClick={() =>
                    handleDeviceToggle(
                      2,
                      deviceNames.fan,
                      fanState,
                      setFan,
                      userPath,
                      autoState
                    )
                  }
                  disabled={autoState}
                >
                  <Power size={16} />
                  {fanState ? "Turn Off" : "Turn On"}
                </button>
              </div>
            )}

            {/* Water Pump */}
            <div
              className={`device-card ${
                pumpState ? "device-active" : "device-inactive"
              }`}
            >
              <div className="device-icon-container">
                <img src={pumpIcon} alt="Pump" className="device-image" />
              </div>
              <div className="device-info">
                <h5 className="device-name">Water Pump</h5>
                <span
                  className={`device-status ${
                    pumpState ? "status-on" : "status-off"
                  }`}
                >
                  {pumpState ? "ON" : "OFF"}
                </span>
              </div>
              <button
                className={`device-toggle-btn ${
                  pumpState ? "btn-stop" : "btn-start"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    3,
                    deviceNames.pump,
                    pumpState,
                    setPump,
                    userPath,
                    autoState
                  )
                }
                disabled={autoState}
              >
                <Power size={16} />
                {pumpState ? "Turn Off" : "Turn On"}
              </button>
            </div>

            {/* Control Valve */}
            <div
              className={`device-card ${
                valveState ? "device-active" : "device-inactive"
              }`}
            >
              <div className="device-icon-container">
                <img src={valveIcon} alt="Valve" className="device-image" />
              </div>
              <div className="device-info">
                <h5 className="device-name">Control Valve</h5>
                <span
                  className={`device-status ${
                    valveState ? "status-on" : "status-off"
                  }`}
                >
                  {valveState ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <button
                className={`device-toggle-btn ${
                  valveState ? "btn-stop" : "btn-start"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    4,
                    deviceNames.valve,
                    valveState,
                    setValve,
                    userPath,
                    autoState
                  )
                }
                disabled={autoState}
              >
                <Power size={16} />
                {valveState ? "Close" : "Open"}
              </button>
            </div>
          </div>
        </div>

        {/* Tank Actions */}
        <div className="tank-actions">
          <button
            className="action-btn btn-stop-all"
            onClick={() => handleStopAll(userPath)}
            disabled={autoState}
          >
            <Power size={20} />
            Stop All Devices
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="control-center-container">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${
            activeTab === "collection" ? "tab-active" : ""
          }`}
          onClick={() => setActiveTab("collection")}
        >
          <Droplet size={18} />
          Collection Tank (User1)
        </button>
        <button
          className={`tab-btn ${activeTab === "discharge" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("discharge")}
        >
          <Droplet size={18} />
          Discharge Tank (User2)
        </button>
        <button
          className={`tab-btn ${activeTab === "system" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("system")}
        >
          <Settings size={18} />
          System Controls
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "system" ? (
        <div className="tab-content system-controls">
          <div className="system-grid">
            {/* Emergency Stop User1 */}
            <div className="system-card emergency">
              <AlertOctagon size={48} className="system-icon" />
              <h4>Collection Tank - Emergency Stop</h4>
              <p>Stop all devices in Collection Tank (User1)</p>
              <button
                className={`system-btn ${
                  user1Stop ? "btn-emergency" : "btn-disabled"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    5,
                    "stop1",
                    user1Stop,
                    setUser1Stop,
                    "user1",
                    user1Auto
                  )
                }
              >
                {user1Stop ? "STOPPING..." : "EMERGENCY STOP"}
              </button>
            </div>

            {/* Emergency Stop User2 */}
            <div className="system-card emergency">
              <AlertOctagon size={48} className="system-icon" />
              <h4>Discharge Tank - Emergency Stop</h4>
              <p>Stop all devices in Discharge Tank (User2)</p>
              <button
                className={`system-btn ${
                  user2Stop ? "btn-emergency" : "btn-disabled"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    5,
                    "stop2",
                    user2Stop,
                    setUser2Stop,
                    "user2",
                    user2Auto
                  )
                }
              >
                {user2Stop ? "STOPPING..." : "EMERGENCY STOP"}
              </button>
            </div>

            {/* Auto Mode User1 */}
            <div className="system-card">
              <RefreshCw size={48} className="system-icon" />
              <h4>Collection Tank - Auto Mode</h4>
              <p>Enable AI-controlled operation (User1)</p>
              <button
                className={`system-btn ${
                  user1Auto ? "btn-enabled" : "btn-disabled"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    6,
                    "auto1",
                    user1Auto,
                    setUser1Auto,
                    "user1",
                    user1Auto
                  )
                }
              >
                {user1Auto ? "AUTO MODE ON" : "ENABLE AUTO"}
              </button>
            </div>

            {/* Auto Mode User2 */}
            <div className="system-card">
              <RefreshCw size={48} className="system-icon" />
              <h4>Discharge Tank - Auto Mode</h4>
              <p>Enable AI-controlled operation (User2)</p>
              <button
                className={`system-btn ${
                  user2Auto ? "btn-enabled" : "btn-disabled"
                }`}
                onClick={() =>
                  handleDeviceToggle(
                    6,
                    "auto2",
                    user2Auto,
                    setUser2Auto,
                    "user2",
                    user2Auto
                  )
                }
              >
                {user2Auto ? "AUTO MODE ON" : "ENABLE AUTO"}
              </button>
            </div>

            {/* System Status User1 */}
            <div className="system-card">
              <Activity size={48} className="system-icon" />
              <h4>Collection Tank Status</h4>
              <p>
                Active Devices:{" "}
                {(user1Bulb ? 1 : 0) +
                  (user1Fan ? 1 : 0) +
                  (user1Pump ? 1 : 0) +
                  (user1Valve ? 1 : 0)}{" "}
                / 4
              </p>
              <button className="system-btn btn-enabled">
                {user1Auto ? "AUTO MODE" : "OPERATIONAL"}
              </button>
            </div>

            {/* System Status User2 */}
            <div className="system-card">
              <Activity size={48} className="system-icon" />
              <h4>Discharge Tank Status</h4>
              <p>
                Active Devices:{" "}
                {(user2Bulb ? 1 : 0) +
                  (user2Pump ? 1 : 0) +
                  (user2Valve ? 1 : 0)}{" "}
                / 3
              </p>
              <button className="system-btn btn-enabled">
                {user2Auto ? "AUTO MODE" : "OPERATIONAL"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        renderTabContent()
      )}
    </div>
  );
};

export default ControlCenter;