import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db_rt } from "../../firebase/firebase";
import {
  FaThermometerHalf,
  FaTint,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import "./Notification.css";

const NotificationSystem = ({ userRole = "user2" }) => {
  const [notifications, setNotifications] = useState([]);

  const sensorConfig = {
    water_level: {
      path: `${userRole}/water_level/current/`,
      icon: FaThermometerHalf,
      iconColor: "#ff6b6b",
      unit: "%",
      rules: [
        {
          condition: (value) => value < 20 || value > 90,
          message: (value) => `High warning of water level: ${value} %`,
          type: "error",
          priority: "high",
        },

        {
          condition: (value) => (value >= 20 && value < 30) || (value > 80 && value <= 90),
          message: (value) => `The water is about overflow: ${value} %`,
          type: "warning",
          priority: "high",
        },
      ],
    },
    temperature: {
      path: `${userRole}/temperature/current`,
      icon: FaThermometerHalf,
      iconColor: "#ff6b6b",
      unit: "%",
      rules: [
        {
          condition: (value) => value < 15 || value > 40,
          message: (value) => `High warning of water: ${value}`,
          type: "error",
          priority: "high",
        },

        {
          condition: (value) => (value >= 15 && value <= 20) || (value > 35 && value <= 40),
          message: (value) => `Warning of water: ${value}`,
          type: "warning",
          priority: "high",
        },
      ],
    },
        ph: {
      path: `${userRole}/ph/current`,
      icon: FaThermometerHalf,
      iconColor: "#ff6b6b",
      unit: "%",
      rules: [
        {
          condition: (value) => value < 5.5 || value > 9,
          message: (value) => `High warning of ph: ${value}`,
          type: "error",
          priority: "high",
        },

        {
          condition: (value) => (value >= 5.5 && value < 6.5) || (value > 8.5 && value <= 9),
          message: (value) => `Warning of ph: ${value}`,
          type: "warning",
          priority: "high",
        },
      ],
    },
    turbidity: {
      path: `${userRole}/turbidity/current`,
      icon: FaThermometerHalf,
      iconColor: "#ff6b6b",
      unit: "%",
      rules: [
        {
          condition: (value) => value > 250,
          message: (value) => `High warning of turbidity: ${value}`,
          type: "error",
          priority: "high",
        },
        {
          condition: (value) => value >= 100 && value <= 250,
          message: (value) => `Warning of turbidity: ${value}`,
          type: "warning",
          priority: "high",
        },
      ],
    },
    
  };

  useEffect(() => {
    const unsubscribes = [];

    // Lắng nghe tất cả cảm biến
    Object.entries(sensorConfig).forEach(([sensorName, config]) => {
      const sensorRef = ref(db_rt, config.path);

      const unsubscribe = onValue(sensorRef, (snapshot) => {
        if (snapshot.exists()) {
          const value = parseFloat(snapshot.val());

          config.rules.forEach((rule) => {
            if (rule.condition(value)) {
              const notification = {
                id: `${sensorName}-${Date.now()}`,
                sensor: sensorName,
                value: value,
                message: rule.message(value),
                type: rule.type,
                priority: rule.priority,
                icon: config.icon,
                iconColor: config.iconColor,
                unit: config.unit,
                timestamp: new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
              };

              setNotifications((prev) => {
                const filtered = prev.filter((n) => n.sensor !== sensorName);
                return [notification, ...filtered].slice(0, 5);
              });
            }
          });
        }
      });

      unsubscribes.push(unsubscribe);
    });

    // Cleanup
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [userRole]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <div className="notification-title">
          <span>System Alerts</span>
        </div>
        {notifications.length > 0 && (
          <button className="clear-all-btn" onClick={clearAll}>
            Clear All
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <FaCheckCircle className="no-notif-icon" />
            <p>All systems normal</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const IconComponent = notif.icon;
            return (
              <div
                key={notif.id}
                className={`notification-card ${notif.type} priority-${notif.priority}`}
              >
                <div className="notif-content">
                  <div className="notif-message">{notif.message}</div>
                  <div className="notif-meta">
                    <span className="notif-sensor">
                      {notif.sensor.toUpperCase()}
                    </span>
                    <span className="notif-time">{notif.timestamp}</span>
                  </div>
                </div>

                <button
                  className="dismiss-btn"
                  onClick={() => dismissNotification(notif.id)}
                >
                  x
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationSystem;
