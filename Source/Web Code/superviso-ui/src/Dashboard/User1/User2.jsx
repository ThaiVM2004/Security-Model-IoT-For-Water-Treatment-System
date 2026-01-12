import React, { useState, useEffect } from "react";
import "./User2.css";
import { auth, db_rt, db } from "../../firebase/firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getDoc } from "firebase/firestore";
import bulbIcon from "../../Components/Assets/icon-bulb.jpg";
import pumpIcon from "../../Components/Assets/icon-pump.jpg";
import valveIcon from "../../Components/Assets/icon-valve.jpg";
import fanIcon from "../../Components/Assets/fan-industrial.png";
import Terminal from "../User1/Terminal_2";
import Water from "../User1/Water_Level_2";
// import Water_Chart from "../User1/Water_Level_Chart";
import Sidebar from "../User1/Sidebar_2";
import { ref, set, onValue } from "firebase/database";
import Chart from "../User1/Water_Level_Chart_2";

//function
const User = () => {
  const [isOn1, setIsOn1] = useState(false);
  const [isOn2, setIsOn2] = useState(false);
  const [isOn3, setIsOn3] = useState(false);
  const [isOn4, setIsOn4] = useState(false);
  const [isOn5, setIsOn5] = useState(false); //stop
  const [isOn6, setIsOn6] = useState(false); //auto
  const [autoMode, setAutoMode] = useState(false);

  const [temperature, setTemperature] = useState("--");
  const [turbidity, setTurbidity] = useState("--");
  const [ph, setph] = useState("--");
  const [activeView, setActiveView] = useState("home");

  const [userInfo, setUserInfo] = useState({
    email: "",
    role: "user",
    username: "guest",
  });

  const [weatherData, setWeatherData] = useState({
    time: "",
    temp: "--",
    humidity: "--",
    loading: true,
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("Did't logged in");
        return;
      } //checking in auth. Haven't account!

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.error("Didn't found user document in Firestore");
          console.error(`User UID: ${currentUser.uid} not fount in Firestore`);
          return;
        }

        //give data in users

        const userData = userDoc.data();

        //check if wrong be:
        if (!userData.role) {
          console.error("User document hadn't field 'role'!");
          console.error("User data:", userData);
          return;
        }

        setUserInfo({
          email: userData.email || currentUser.email,
          role: userData.role,
          username:
            userData.username ||
            userData.email?.split("@")[0] ||
            currentUser.email.split("@")[0],
        });

        console.log("Gived informations in users was completed!", {
          email: userData.email,
          role: userData.role,
          username: userData.username,
        });
      } catch (error) {
        console.error("Error details:", error.message);
      }
    };

    fetchUserInfo();
  }, []);

  const sendCommandToTerminal = async (device, action) => {
    try {
      const command = `db/${userInfo.username}/${userInfo.role}/${device}/${action}`;

      await addDoc(collection(db, "terminal_commands_2"), {
        command: command,
        type: "input",
        timestamp: new Date().toLocaleString("vi-VN"),
        user: userInfo.username,
        device: device,
        action: action,
        role: userInfo.role,
        processed: false,
      });

      setTimeout(async () => {
        const status = Math.random() > 0.1 ? "success" : "error"; // 90% success rate
        const responseMsg =
          status === "success"
            ? `Device ${device} turned ${action.toUpperCase()} successfully`
            : `Failed to control ${device}`;
      }, 500);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };

  useEffect(() => {
    if (!userInfo.username || userInfo.username === "guest") {
      return;
    }

    const devices = [
      { name: "bulb2", setState: setIsOn1 },
      { name: "fan_industrial2", setState: setIsOn2 },
      { name: "pump2", setState: setIsOn3 },
      { name: "valve2", setState: setIsOn4 },
      { name: "stop2", setState: setIsOn5 },
      { name: "auto2", setState: setIsOn6 },
    ];

    const unsubscribes = [];

    devices.forEach((device) => {
      const deviceRef = ref(db_rt, `user2/${device.name}/`);

      const unsubscribe = onValue(
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
          console.error(` Error with ${device.name}:`, error);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [userInfo.username]);

  useEffect(() => {
    // temperature
    const tempRef = ref(db_rt, "user2/temperature/current");
    const tempUnsub = onValue(
      tempRef,
      (snap) => {
        if (snap.exists()) setTemperature(snap.val());
        else setTemperature("--");
      },
      (err) => console.error("temp read error", err)
    );

    // turbidity
    const turbRef = ref(db_rt, "user2/turbidity/current");
    const turbUnsub = onValue(
      turbRef,
      (snap) => {
        if (snap.exists()) setTurbidity(snap.val());
        else setTurbidity("--");
      },
      (err) => console.error("turbidity read error", err)
    );

    const phRef = ref(db_rt, "user2/ph/current");
    const phUnsub = onValue(
      phRef,
      (snap) => {
        if (snap.exists()) setph(snap.val());
        else setph("--");
      },
      (err) => console.error("pH read error", err)
    );

    // cleanup
    return () => {
      tempUnsub();
      turbUnsub();
    };
  }, []);

  const handleDeviceToggle = async (
    deviceNumber,
    deviceName,
    currentState,
    setState
  ) => {
    const newState = !currentState;
    setState(newState);

    const action = newState ? "on" : "off";
    await sendCommandToTerminal(deviceName, action);

    if (!userInfo.username || userInfo.username === "guest") {
      console.error("Didn't write firebase");
      return;
    }

    try {
      const deviceRef = ref(db_rt, `user2/${deviceName}/`);
      await set(deviceRef, action);
      if (deviceName === "auto2" && action === "on") {
        setAutoMode(true);
        const allDevices = [
          "bulb2",
          "air_conditioner2",
          "pump2",
          "valve2",
          "fan_industrial2",
        ];

        for (let dev of allDevices) {
          const refDev = ref(db_rt, `user2/${dev}`);
          await set(refDev, "off");
          await sendCommandToTerminal(dev, "off");
        }
      }

      if (deviceName === "auto2" && action === "off") {
        setAutoMode(false);
      }
      // Nếu là nút STOP và được bật → tắt toàn bộ thiết bị
      if (deviceName === "stop2" && action === "on") {
        const allDevices = [
          "bulb2",
          "air_conditioner2",
          "pump2",
          "valve2",
          "fan_industrial2",
        ];

        for (let dev of allDevices) {
          const refDev = ref(db_rt, `user2/${dev}`);
          await set(refDev, "off");
          await sendCommandToTerminal(dev, "off");
        }
      }
    } catch (error) {
      console.error("Error updated firebase", error);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const fetchWeather = async () => {
    try {
      const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
      const city = "Di An";
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=379a081716a02ba70e3b3579594f3303&units=metric&lang=vi`
      );
      const data = await response.json();

      setWeatherData({
        time: getCurrentTime(),
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        loading: false,
      });
    } catch (error) {
      console.error("Error while was giving data of weather", error);
      setWeatherData({
        time: getCurrentTime(),
        temp: "--",
        humidity: "--",
        loading: false,
      });
    }
  };

  useEffect(() => {
    fetchWeather();

    const timeInterval = setInterval(() => {
      setWeatherData((prev) => ({
        ...prev,
        time: getCurrentTime(),
      }));
    }, 60000);

    const weatherInterval = setInterval(fetchWeather, 600000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  return (
    <div className="user1-board">
      <div className="user1-sidebar">
        <Sidebar
          userInfo={userInfo}
          activeView={activeView}
          onSelect={setActiveView}
        />
      </div>

      <div className="user1-mainbar">
        {activeView === "home" && (
          <>
            <div className="card bulb1">
              <img src={bulbIcon} alt="Bulb" className="device-icons" />

              <button
                disabled={autoMode}
                className={`power-btn ${isOn1 ? "on" : "off"}`}
                onClick={() => handleDeviceToggle(1, "bulb2", isOn1, setIsOn1)}
              ></button>
            </div>

            {/* <div className="card fanIndustrial1">
              <img
                src={fanIcon}
                alt="fanIndustrial1"
                className="device-icons"
              />

              <button
                disabled={autoMode}
                className={`power-btn ${isOn2 ? "on" : "off"}`}
                onClick={() =>
                  handleDeviceToggle(2, "fan_industrial2", isOn2, setIsOn2)
                }
              ></button>
            </div> */}

            {/* Pump */}
            <div className="card pump">
              <img src={pumpIcon} alt="Pump" className="device-icons" />

              <button
                disabled={autoMode}
                className={`power-btn ${isOn3 ? "on" : "off"}`}
                onClick={() => handleDeviceToggle(3, "pump2", isOn3, setIsOn3)}
              ></button>
            </div>

            {/* valve */}
            <div className="card valve">
              <img src={valveIcon} alt="Valve" className="device-icons" />
              <button
                disabled={autoMode}
                className={`power-btn ${isOn4 ? "on" : "off"}`}
                onClick={() => handleDeviceToggle(4, "valve2", isOn4, setIsOn4)}
              ></button>
            </div>

            <div className="card main-information">
              <div className="weather-bar">
                <div className="weather-item">
                  <span className="weather-label">TIME</span>
                  <div className="weather-display">
                    <span className="weather-value">{weatherData.time}</span>
                  </div>
                </div>

                <div className="weather-divider"></div>

                <div className="weather-item">
                  <span className="weather-label">TEMPERATURE</span>
                  <div className="weather-display">
                    <span className="weather-value">{weatherData.temp}°</span>
                  </div>
                </div>

                <div className="weather-divider"></div>

                <div className="weather-item">
                  <span className="weather-label">HUMIDITY</span>
                  <div className="weather-display">
                    <span className="weather-value">
                      {weatherData.humidity}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="terminal-wrapper">
                <Terminal userInfo={userInfo} />
              </div>
            </div>

            <div className="card water-level">
              <Water
                db_rt={db_rt}
                db={db}
                username={userInfo.username}
                userInfo={userInfo}
              />
            </div>

            <div className="card function-btn">
              <span className="fuction-text">Function Button</span>
              <div className="stop-btn">
                <span className="stop-btn-text">STOP BUTTON</span>
                <div className="position-btn">
                  <button
                    disabled={autoMode}
                    className={`power-btn ${isOn5 ? "on" : "off"}`}
                    onClick={() =>
                      handleDeviceToggle(5, "stop2", isOn5, setIsOn5)
                    }
                  ></button>
                </div>
              </div>
              <div className="auto-btn">
                <span className="auto-btn-text">AUTO MODE</span>
                <div className="position-btn">
                  <button
                    className={`power-btn ${isOn6 ? "on" : "off"}`}
                    onClick={() =>
                      handleDeviceToggle(6, "auto2", isOn6, setIsOn6)
                    }
                  ></button>
                </div>
              </div>
            </div>

            <div className="card sensor-neo pH">
              <div className="sensor-neo-header">
                <div className="sensor-neo-icon"></div>
                <div className="sensor-neo-title">PH</div>
              </div>

              <div className="sensor-neo-value-box">
                <span className="sensor-neo-value">{ph}</span>
                <span className="sensor-neo-unit">pH</span>
              </div>
            </div>

            {/* ================= TEMPERATURE ================ */}
            <div className="card sensor-neo temperature-card">
              <div className="sensor-neo-header">
                <div className="sensor-neo-icon"></div>
                <div className="sensor-neo-title">TEMPERATURE</div>
              </div>

              <div className="sensor-neo-value-box">
                <span className="sensor-neo-value">{temperature}</span>
                <span className="sensor-neo-unit">°C</span>
              </div>
            </div>

            <div className="card sensor-neo turbidity-card-2">
              <div className="sensor-neo-header">
                <div className="sensor-neo-icon"></div>
                <div className="sensor-neo-title">TURBIDITY</div>
              </div>

              <div className="sensor-neo-value-box">
                <span className="sensor-neo-value">{turbidity}</span>
                <span className="sensor-neo-unit">NTU</span>
              </div>
            </div>
          </>
        )}
        {activeView === "chart" && (
          <div className="chart-page">
            <Chart />
          </div>
        )}
      </div>
    </div>
  );
};

export default User;
