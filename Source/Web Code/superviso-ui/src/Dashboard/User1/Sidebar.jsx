import { FaSignOutAlt, FaUserCircle, FaChartLine, FaHome } from "react-icons/fa";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
import Notification from "./Notification";
import React from "react";

const Sidebar = ({ userInfo, onSelect, activeView }) => {
  const navigate = useNavigate();

  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <span className="brand-text">COLLECTION TANK</span>
      </div>

      <div className="user-profile-section">
        <FaUserCircle className="avatar-icon" />
        <h3 className="username">{userInfo.username}</h3>
        <span className="role-badge">{userInfo.role}</span>
      </div>

      <div className="sidebar-divider-user1"></div>

      {/* SWITCH TABS */}
      <div className="switch-tabs">

        {/* HOME */}
        <button
          className={`switch-btn ${activeView === "home" ? "active" : ""}`}
          onClick={() => onSelect("home")}
        >
          <FaHome /> Home
        </button>

        {/* CHART */}
        <button
          className={`switch-btn ${activeView === "chart" ? "active" : ""}`}
          onClick={() => onSelect("chart")}
        >
          <FaChartLine /> Chart
        </button>

      </div>

      <Notification userRole={userInfo.role} />

      <div className="sidebar-spacer"></div>

      <button
        className="logout-btn"
        onClick={async () => {
          await signOut(auth);
          navigate("/");
        }}
      >
        <FaSignOutAlt /> Logout
      </button>
    </div>
  );
};

export default Sidebar;
