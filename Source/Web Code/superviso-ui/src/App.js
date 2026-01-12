
import { React, useEffect, useState, useRef } from "react";
import LoginForm from "./LoginForm/LoginForm";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Register from "./Register/Register";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Admin from "./Admin/Admin";
import User1 from "./Dashboard/User1/User1";
import User2 from "./Dashboard/User1/User2";
import { FaGithub, FaEnvelope } from "react-icons/fa";

function App() {
  const location = useLocation();

  const [displayText, setDisplayText] = useState("");
  const fullText = "IoT Water Treatment Control System";

  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (location.pathname !== "/") return;

    const typeWriter = () => {
      if (indexRef.current < fullText.length) {
        setDisplayText(fullText.slice(0, indexRef.current + 1));
        indexRef.current++;

        timeoutRef.current = setTimeout(typeWriter, 150);
      } else {
        timeoutRef.current = setTimeout(() => {
          indexRef.current = 0;
          setDisplayText("");
          typeWriter();
        }, 8000);
      }
    };

    typeWriter();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);

  useEffect(() => {
    document.body.className = "";

    if (location.pathname === "/") {
      document.body.classList.add("login-bg");
    } else if (location.pathname === "/register") {
      document.body.classList.add("login-bg");
    } else if (location.pathname === "/user-dashboard") {
      document.body.classList.add("user-bg");
    }
  }, [location]);

  // Chỉ hiển thị footer trên trang login và register
  const showFooter = location.pathname === "/" || location.pathname === "/register";

  return (
    <>
      {location.pathname === "/" && (
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            textAlign: "center",
            zIndex: 1,
          }}
        >
          <h1
            style={{
              color: "white",
              fontSize: "48px",
              fontWeight: "700",
              textShadow: "2px 2px 20px rgba(0,0,0,0.8)",
              letterSpacing: "2px",
              margin: 0,
              minHeight: "60px",
            }}
          >
            {displayText}
          </h1>
        </div>
      )}

      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-dashboard" element={<Admin />} />
        <Route path="/user1-dashboard" element={<User1 />} />
        <Route path="/user2-dashboard" element={<User2 />} />
      </Routes>

      {/* Footer - Chỉ hiển thị trên login/register */}
      {showFooter && (
        <div
  style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "20px",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          {/* GitHub Link */}
          <a
            href="https://github.com/ThaiVM2004"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "rgba(14, 13, 13, 0.8)",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              padding: "8px 15px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "white";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(14, 13, 13, 0.8)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <FaGithub size={20} />
            <span>GitHub</span>
          </a>

          {/* Email Link */}
          <a
            href="mailto:thaivm14072004@gmail.com"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "rgba(14, 13, 13, 0.8)",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              padding: "8px 15px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "white";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(14, 13, 13, 0.8)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <FaEnvelope size={20} />
            <span>Contact</span>
          </a>
        </div>
      )}

      <ToastContainer position="top-center" autoClose={2000} theme="colored" />
    </>
  );
}

export default App;
