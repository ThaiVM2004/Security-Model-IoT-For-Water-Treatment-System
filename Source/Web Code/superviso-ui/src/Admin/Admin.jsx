import React, { useState, useEffect } from "react";
import {
  Droplet,
  Bell,
  BarChart3,
  Activity,
  FileText,
  Settings,
  Users,
  CheckCircle,
  AlertTriangle,
  Thermometer,
  Shield,
  Database,
  Cpu,
  Clock,
  Battery,
  Wifi,
  AlertCircle,
  Eye,
  Filter,
  HardDrive,
  Network,
  Lock,
  Power,
  RefreshCw,
  Server,
  Cloud,
  ActivitySquare,
  ShieldCheck,
  AlertOctagon,
  ChevronRight,
} from "lucide-react";
import "./Admin.css";
import Control from "./Control";
import { db_rt } from "../firebase/firebase";
import { ref, onValue } from "firebase/database";

import { FaSignOutAlt } from "react-icons/fa";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const [runtime, setRuntime] = useState(0);
  const [time, setTime] = useState(new Date());
  const [activeView, setActiveView] = useState("overview");
  const navigate = useNavigate();

  // System Health State - ĐẢM BẢO TẤT CẢ LÀ PRIMITIVE VALUES
  const [systemHealth] = useState({
    status: "running",
    uptime: "99.8%",
    sensorOnline: 7,
    sensorTotal: 7,
    lastUpdate: "3s ago",
    compliance: "QCVN 40:2011",
  });

  // Tank Data - TÁCH RIÊNG TỪNG STATE
  //1
  const [collectionTemp, setCollectionTemp] = useState(0);
  const [collectionTurbidity, setCollectionTurbidity] = useState(0);
  const [collectionLevel, setCollectionLevel] = useState(0);

  //2
  const [dischargeTemp, setDischargeTemp] = useState(0);
  const [dischargeTurbidity, setDischargeTurbidity] = useState(0);
  const [dischargePH, setDischargePH] = useState(0);
  const [dischargeLevel, setDischargeLevel] = useState(0);

  const [alerts, setAlerts] = useState([]);

  const THRESHOLDS = {
    ph: { min: 6.5, max: 8.5 },
    temperature: { min: 15, max: 35 },
    turbidity: { warning: 250, critical: 350 },
    level: { min: 30, max: 80 },
  };

  // Tank static data - KHÔNG THAY ĐỔI
  const collectionTank = {
    id: "CT-001",
    name: "Collection Tank",
    ph: NaN,
    level: 75,
    tss: 350,
    cod: 850,
    status: "warning",
    location: "Zone A",
  };

  const dischargeTank = {
    id: "DT-001",
    name: "Discharge Tank",
    ph: 7.2,
    level: 68,
    tss: 35,
    cod: 85,
    status: "normal",
    location: "Zone C",
  };

  useEffect(() => {
    //1
    const tempRef1 = ref(db_rt, "user1/temperature/current");
    const unsubscribe1 = onValue(tempRef1, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setCollectionTemp(Number(data));
      }
    });

    const turbidityRef1 = ref(db_rt, "user1/turbidity/current");
    const unsubscribe3 = onValue(turbidityRef1, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setCollectionTurbidity(Number(data));
      }
    });

    const levelRef1 = ref(db_rt, "user1/water_level/current");
    const unsubscribe5 = onValue(levelRef1, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setCollectionLevel(Number(data));
      }
    });

    //oke

    //2

    const tempRef2 = ref(db_rt, "user2/temperature/current");
    const unsubscribe2 = onValue(tempRef2, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setDischargeTemp(Number(data)); // ĐẢM BẢO LÀ NUMBER
      }
    });

    const turbidityRef2 = ref(db_rt, "user2/turbidity/current");
    const unsubscribe4 = onValue(turbidityRef2, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setDischargeTurbidity(Number(data));
      }
    });

    const levelRef2 = ref(db_rt, "user2/water_level/current");
    const unsubscribe6 = onValue(levelRef2, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setDischargeLevel(Number(data));
      }
    });

    const phRef2 = ref(db_rt, "user2/ph/current");
    const unsubscribe7 = onValue(phRef2, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setDischargePH(Number(data));
      }
    });

    const runtimeTimer = setInterval(() => {
      setRuntime((prev) => prev + 1);
    }, 60000);

    const timeTimer = setInterval(() => setTime(new Date()), 1000);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
      unsubscribe5();
      unsubscribe6();
      unsubscribe7();
      clearInterval(runtimeTimer);
      clearInterval(timeTimer);
    };
  }, []);

  const formatRuntime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Header Widgets - ĐƠN GIẢN HÓA
  const HeaderWidgets = () => {
    const newAlertsCount = alerts.filter((a) => a.status === "new").length;

    return (
      <div className="header-widgets">
        <div className={`system-health-badge health-${systemHealth.status}`}>
          <div className="health-icon">
            {systemHealth.status === "running" ? (
              <CheckCircle size={20} />
            ) : systemHealth.status === "warning" ? (
              <AlertTriangle size={20} />
            ) : (
              <AlertOctagon size={20} />
            )}
          </div>
          <div className="health-text">
            <div className="health-status">
              System: <strong>{systemHealth.status.toUpperCase()}</strong>
            </div>
            <div className="health-subtext">
              {systemHealth.sensorOnline}/{systemHealth.sensorTotal} sensors
            </div>
          </div>
        </div>

        <div className="header-widget">
          <Clock className="widget-icon" size={20} />
          <div className="widget-text">
            <div className="widget-value">{formatRuntime(runtime)}</div>
            <div className="widget-label">Uptime</div>
          </div>
        </div>
      </div>
    );
  };

  const generateAlerts = () => {
    const newAlerts = [];
    const timestamp = new Date().toLocaleTimeString();

    // Temperature vượt ngưỡng
    if (
      collectionTemp < THRESHOLDS.temperature.min ||
      collectionTemp > THRESHOLDS.temperature.max
    ) {
      newAlerts.push({
        id: `col-temp-${Date.now()}-${Math.random()}`,
        type:
          collectionTemp > 40 || collectionTemp < 10 ? "critical" : "warning",
        param: "Temperature",
        value: collectionTemp.toFixed(1),
        threshold: `${THRESHOLDS.temperature.min}-${THRESHOLDS.temperature.max}°C`,
        tank: "Collection",
        time: timestamp,
        status: "new",
      });
    }

    // Turbidity vượt ngưỡng
    if (collectionTurbidity > THRESHOLDS.turbidity.warning) {
      newAlerts.push({
        id: `col-turb-${Date.now()}-${Math.random()}`,
        type:
          collectionTurbidity > THRESHOLDS.turbidity.critical
            ? "critical"
            : "warning",
        param: "Turbidity",
        value: collectionTurbidity.toFixed(2),
        threshold: `<${THRESHOLDS.turbidity.warning} NTU`,
        tank: "Collection",
        time: timestamp,
        status: "new",
      });
    }

    // Level vượt ngưỡng
    if (
      collectionLevel < THRESHOLDS.level.min ||
      collectionLevel > THRESHOLDS.level.max
    ) {
      newAlerts.push({
        id: `col-level-${Date.now()}-${Math.random()}`,
        type:
          collectionLevel < 10 || collectionLevel > 95 ? "critical" : "warning",
        param: "Level",
        value: collectionLevel.toFixed(0),
        threshold: `${THRESHOLDS.level.min}-${THRESHOLDS.level.max}%`,
        tank: "Collection",
        time: timestamp,
        status: "new",
      });
    }

    // pH vượt ngưỡng
    if (dischargePH < THRESHOLDS.ph.min || dischargePH > THRESHOLDS.ph.max) {
      newAlerts.push({
        id: `dis-ph-${Date.now()}-${Math.random()}`,
        type: dischargePH < 6.0 || dischargePH > 9.0 ? "critical" : "warning",
        param: "pH",
        value: dischargePH.toFixed(1),
        threshold: `${THRESHOLDS.ph.min}-${THRESHOLDS.ph.max}`,
        tank: "Discharge",
        time: timestamp,
        status: "new",
      });
    }

    // Temperature vượt ngưỡng
    if (
      dischargeTemp < THRESHOLDS.temperature.min ||
      dischargeTemp > THRESHOLDS.temperature.max
    ) {
      newAlerts.push({
        id: `dis-temp-${Date.now()}-${Math.random()}`,
        type: dischargeTemp > 40 || dischargeTemp < 10 ? "critical" : "warning",
        param: "Temperature",
        value: dischargeTemp.toFixed(1),
        threshold: `${THRESHOLDS.temperature.min}-${THRESHOLDS.temperature.max}°C`,
        tank: "Discharge",
        time: timestamp,
        status: "new",
      });
    }

    // Turbidity vượt ngưỡng
    if (dischargeTurbidity > THRESHOLDS.turbidity.warning) {
      newAlerts.push({
        id: `dis-turb-${Date.now()}-${Math.random()}`,
        type:
          dischargeTurbidity > THRESHOLDS.turbidity.critical
            ? "critical"
            : "warning",
        param: "Turbidity",
        value: dischargeTurbidity.toFixed(2),
        threshold: `<${THRESHOLDS.turbidity.warning} NTU`,
        tank: "Discharge",
        time: timestamp,
        status: "new",
      });
    }

    // Level vượt ngưỡng
    if (
      dischargeLevel < THRESHOLDS.level.min ||
      dischargeLevel > THRESHOLDS.level.max
    ) {
      newAlerts.push({
        id: `dis-level-${Date.now()}-${Math.random()}`,
        type:
          dischargeLevel < 10 || dischargeLevel > 95 ? "critical" : "warning",
        param: "Level",
        value: dischargeLevel.toFixed(0),
        threshold: `${THRESHOLDS.level.min}-${THRESHOLDS.level.max}%`,
        tank: "Discharge",
        time: timestamp,
        status: "new",
      });
    }

    return newAlerts;
  };

  useEffect(() => {
    const checkAlerts = () => {
      const detectedAlerts = generateAlerts();
      setAlerts(detectedAlerts);
    };

    // Check ngay khi component mount
    checkAlerts();

    // Check mỗi 5 giây
    const alertInterval = setInterval(checkAlerts, 5000);

    return () => clearInterval(alertInterval);
  }, [
    // Dependencies: khi các giá trị này thay đổi, check lại alerts
    collectionTemp,
    collectionTurbidity,
    collectionLevel,
    dischargeTemp,
    dischargeTurbidity,
    dischargePH,
    dischargeLevel,
  ]);

  // SIMPLE COMPONENTS - ĐẢM BẢO KHÔNG RENDER OBJECT
  const KPICard = ({ title, value, change, icon, period, status }) => {
    // Đảm bảo value là string/number
    const displayValue =
      typeof value === "string" || typeof value === "number"
        ? value
        : String(value);

    return (
      <div className={`kpi-card ${status ? `kpi-${status}` : ""}`}>
        <div className="kpi-header">
          <div className="kpi-icon">{icon}</div>
          <div className="kpi-title">{title}</div>
        </div>
        <div className="kpi-value">{displayValue}</div>
        <div className="kpi-period">{period}</div>
      </div>
    );
  };

  const NavItem = ({ icon, label, active, badge, onClick }) => (
    <div
      className={`nav-item ${active ? "nav-item-active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {badge && badge > 0 && <span className="nav-badge">{badge}</span>}
    </div>
  );

  // Tank row component - HYBRID VERSION
  const TankRow = ({ tank, temperature, turbidity, ph, level }) => {
    return (
      <tr className="tank-row">
        <td>
          <div className="tank-name-cell">
            <div className="tank-icon">
              {tank.name.includes("Collection") ? (
                <Filter size={20} />
              ) : (
                <Droplet size={20} />
              )}
            </div>
            <span>{tank.name}</span>
          </div>
        </td>
        <td>
          <code>{tank.id}</code>
        </td>
        <td>
          <div
            className={`value-cell ${
              temperature < 15 || ph > 35 ? "value-warning" : ""
            }`}
          >
            {temperature}
            <span className="value-unit">°C</span>
          </div>
        </td>
        <td>
          <div
            className={`value-cell ${
              ph < 6.5 || ph > 8.5 ? "value-warning" : ""
            }`}
          >
            {ph}
          </div>
        </td>
        <td>
          <div className="value-cell">
            {tank.tss}
            <span className="value-unit"> mg/L</span>
          </div>
        </td>
        <td>
          <div className="value-cell">
            {tank.cod}
            <span className="value-unit"> mg/L</span>
          </div>
        </td>
        <td>
          <div className="level-bar">
            <div className="level-fill" style={{ width: `${level}%` }} />
            <span className="level-text">{level}%</span>
          </div>
        </td>
        <td>
          <div
            className={`value-cell ${turbidity >= 200 ? "value-warning" : ""}`}
          >
            {turbidity}
            <span className="value-unit">NTU</span>
          </div>
        </td>
      </tr>
    );
  };

  const renderOverview = () => {
    const activeAlertsCount = alerts.length;

    return (
      <div className="main-content">
        <div className="kpi-grid">
          <KPICard
            title="Total Water Processed"
            value="3,240 m³"
            icon={<Droplet size={24} />}
            period="today"
          />

          <KPICard
            title="Compliance Rate"
            value="98.5%"
            icon={<ShieldCheck size={24} />}
          />

          <KPICard
            title="Active Alerts"
            value={activeAlertsCount}
            icon={<AlertTriangle size={24} />}
            status={activeAlertsCount > 0 ? "warning" : "good"}
          />
          <KPICard
            title="System Uptime"
            value={systemHealth.uptime}
            icon={<Activity size={24} />}
            period="30 days"
          />
        </div>

        <div className="tank-matrix-card">
          <h2 className="card-title">
            <span>TANKS & ASSETS OVERVIEW</span>
          </h2>
          <div className="tank-table">
            <table>
              <thead>
                <tr>
                  <th>Tank</th>
                  <th>ID</th>
                  <th>Temp (°C)</th>
                  <th>pH</th>
                  <th>TSS (mg/L)</th>
                  <th>COD (mg/L)</th>
                  <th>Level</th>
                  <th>Turbidity</th>
                </tr>
              </thead>
              <tbody>
                <TankRow
                  tank={collectionTank}
                  temperature={collectionTemp}
                  turbidity={collectionTurbidity}
                  level={collectionLevel}
                />
                <TankRow
                  tank={dischargeTank}
                  temperature={dischargeTemp}
                  turbidity={dischargeTurbidity}
                  ph={dischargePH}
                  level={dischargeLevel}
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className="alert-timeline-card">
          <h2 className="card-title">
            <span>RECENT ALERTS TIMELINE</span>
          </h2>
          <div className="alert-timeline-content">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <CheckCircle
                  size={48}
                  style={{ color: "#22c55e", marginBottom: "0.5rem" }}
                />
                <p>No active alerts - System operating normally</p>
              </div>
            ) : (
              <div className="alert-timeline-list">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={alert.id}
                    className={`timeline-item alert-type-${alert.type}`}
                  >
                    <div className="timeline-marker">
                      {alert.type === "critical"
                        ? ""
                        : alert.type === "warning"
                        ? ""
                        : ""}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-time">{alert.time}</span>
                        <span className={`timeline-badge badge-${alert.type}`}>
                          {alert.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="timeline-message">
                        <strong>{alert.tank} Tank:</strong> {alert.param}{" "}
                        {alert.type === "critical" ? "critically" : ""} exceeded
                        threshold - Current: <strong>{alert.value}</strong>
                        {alert.param === "pH"
                          ? ""
                          : alert.param === "Temperature"
                          ? "°C"
                          : alert.param === "Level"
                          ? "%"
                          : " NTU"}{" "}
                        (Threshold: {alert.threshold})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {alerts.length > 5 && (
              <div className="timeline-footer">
                <button
                  className="view-all-btn"
                  onClick={() => setActiveView("alerts")}
                >
                  View all {alerts.length} alerts →
                </button>
              </div>
            )}

            {alerts.length > 0 && (
              <div className="alert-summary">
                <AlertTriangle size={16} />
                <span>Alert frequency: {alerts.length} alerts detected</span>
                {alerts.filter((a) => a.type === "critical").length > 0 && (
                  <span className="critical-count">
                    {alerts.filter((a) => a.type === "critical").length}{" "}
                    critical
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderControl = () => (
    <div className="main-content">
      <Control
        collectionTemp={collectionTemp}
        collectionTurbidity={collectionTurbidity}
        collectionLevel={collectionLevel}
        dischargeTemp={dischargeTemp}
        dischargeTurbidity={dischargeTurbidity}
        dischargePH={dischargePH}
        dischargeLevel={dischargeLevel}
      />
    </div>
  );

  // System Health Page - ĐƠN GIẢN
  const renderSystemHealth = () => (
    <div className="main-content">
      <div className="health-grid">
        <div className="health-card">
          <h3 className="health-card-title">
            <Network className="title-icon" size={20} />
            <span>NETWORK STATUS</span>
          </h3>
          <div className="health-status-list">
            <div className="health-status-item status-good">
              <Wifi className="status-icon" size={18} />
              <span>Firebase Realtime</span>
              <span className="status-indicator" />
            </div>
            <div className="health-status-item status-good">
              <Cloud className="status-icon" size={18} />
              <span>Cloud Functions</span>
              <span className="status-indicator" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render content
  const renderContent = () => {
    switch (activeView) {
      case "overview":
        return renderOverview();
      case "health":
        return renderSystemHealth();
      case "control":
        return renderControl();
      default:
        return renderOverview();
    }
  };

  // Tính toán badge counts
  const newAlertsCount = alerts.filter((a) => a.status === "new").length;

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left">
          <Droplet className="header-icon" size={40} />
          <div className="header-text">
            <h1 className="header-title">IWTCS ADMIN DASHBOARD</h1>
          </div>
        </div>
        <div className="header-right">
          <HeaderWidgets />
          <div className="time-display">
            <div className="time">{time.toLocaleTimeString()}</div>
            <div className="date">
              {time.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="user-avatar">AD</div>
        </div>
      </header>

      <div className="admin-board">
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-text">ADMIN NAVIGATION</h2>
          </div>
          <nav className="sidebar-nav">
            <NavItem
              icon={<BarChart3 size={20} />}
              label="Overview"
              active={activeView === "overview"}
              onClick={() => setActiveView("overview")}
            />
            <NavItem
              icon={<Settings size={20} />}
              label="Control"
              active={activeView === "control"}
              onClick={() => setActiveView("control")}
            />
          </nav>
          <div className="sidebar-spacer-a">
            <button
              className="logout-btn-admin"
              onClick={async () => {
                await signOut(auth);
                navigate("/");
              }}
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </aside>

        <main className="admin-mainbar">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Admin;
