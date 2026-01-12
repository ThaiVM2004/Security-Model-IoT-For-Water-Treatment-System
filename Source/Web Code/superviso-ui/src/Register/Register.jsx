import React, { useState } from "react";
import "../LoginForm/LoginForm.css";
import { FaUser } from "react-icons/fa";
import { TbLockPassword } from "react-icons/tb";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Register = () => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Incorrect Username/Password !");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    setLoading(true);

    try {
      const fakeEmail = `${account}@myapp.local`;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        fakeEmail,
        password
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        account: account,
        email: fakeEmail,
        password: password,
        role: role,
        createdAt: new Date().toLocaleString("vi-VN"),
        processed: false,
      });

      toast.success("Register Completed ! Directing to home page...", {
        position: "top-center",
        autoClose: 2000,
      });

      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("Username is used");
          break;
        case "auth/invalid-email":
          setError("Username Invalid");
          break;
        case "auth/operation-not-allowed":
          setError("Register is not allowed");
          break;
        case "auth/weak-password":
          setError("Password is weak");
          break;
        default:
          setError("Had Error. Please retry");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleSubmit}>
        <h1>Register</h1>

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

        <div className="input-box">
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <TbLockPassword className="icons" />
        </div>

        <div className="role-selection">
          <select
            className="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="user1">User1</option>
            <option value="user2">User2</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing" : "Register"}
        </button>

        <div className="register-link">
          <p>
            Already have an account? <a href="/">Login</a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;
