import React, { useState, useEffect } from "react";
import "./LoginForm.css"; // css file
import { FaUser } from "react-icons/fa"; //icon
import { TbLockPassword } from "react-icons/tb"; //icon
import { auth, db } from "../firebase/firebase"; //source
import { useNavigate } from "react-router-dom"; //flow
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const LoginForm = () => {
  //define variable and action
  const [account, setAccount] = useState(""); //var , action and setDefault
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fakeEmail = `${account}@myapp.local`;
      const userCredential = await signInWithEmailAndPassword(
        auth,
        fakeEmail,
        password
      );
      const user = userCredential.user; //if true, firebase return user
      const userDocRef = doc(db, "users", user.uid); //read uid and users
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;

        if (userRole === "user1") {
          navigate("/user1-dashboard");
        } else if (userRole === "admin") {
          navigate("/admin-dashboard");
        } else if (userRole === "user2") {
          navigate("/user2-dashboard");
        } else if (userRole === "user3") {
          navigate("/user3-dashboard");
        } else if (userRole === "user4") {
          navigate("/user4-dashboard");
        } else {
          setError("Didn't find information !");
        }
      }
    } catch (error) {
      console.error("Login error", error);

      switch (error.code) {
        case "auth/invalid-email":
          setError("Username/Password is invalid");

          break;
        case "auth/user-disabled":
          setError("Account is disabled");

          break;
        case "auth/user-not-found":
          setError("Don't find account");

          break;
        case "auth/wrong-password":
          setError("Username/Password is invalid");

          break;
        case "auth/invalid-credential":
          setError("Username/Password is invalid");

          break;
        default:
          setError("Error. Please retry !");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleSubmit}>
        <h1> Login </h1>
        
        {error && <div className="error-message">{error}</div>}

        <div className="input-box">
          <input
            type="text"
            placeholder="Username"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
          />
          <FaUser className="icons" />
        </div>

        <div className="input-box">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <TbLockPassword className="icons" />
        </div>

        {/* <div className="remember-forgot">
          <label>
            <input type="checkbox" />
            Remember me
          </label>
          <a href="#">Forgot password?</a>
        </div> */}

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </button>

        <div className="register-link">
          <p>
            Don't have an account? <a href="/register">Register</a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
