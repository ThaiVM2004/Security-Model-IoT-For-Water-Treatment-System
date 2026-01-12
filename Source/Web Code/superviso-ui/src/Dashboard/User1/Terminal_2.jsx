// Terminal.jsx
import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import "./Terminal.css";

const Terminal = ({ userInfo }) => {

  const [notifications, setNotifications] = useState([]);
  const notificationEndRef = useRef(null);

  const scrollToBottom = () => {
    notificationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [notifications]);

  useEffect(() => {
    const q = query(
      collection(db, "terminal_commands_2"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = [];
      snapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(fetchedNotifications.reverse());
    });

    return () => unsubscribe();
  }, []);




  const getNotificationType = (notification) => {
    if (notification.notificationType) return notification.notificationType;
    if (notification.status === "success") return "success";
    if (notification.status === "error") return "error";
    return "info";
  };

  const handleClearAll = async () => {
    try {
      // Get all documents
      const q = query(collection(db, "terminal_commands_2"));
      const querySnapshot = await getDocs(q);

      // Delete all documents
      const deletePromises = querySnapshot.docs.map((document) =>
        deleteDoc(doc(db, "terminal_commands_2", document.id))
      );

      await Promise.all(deletePromises);
      setNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return (
    <div className="notification-container">
      <div className="notification-header">
        <div className="notification-title">Notification Center</div>
        <div className="notification-actions">
          <button className="action-button" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </div>

      <div className="notification-content">
        <div className="notification-main">
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">
                  No notifications
                  <br />
                  Waiting for system messages...
                </div>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={notification.id || index}
                  className={`notification-item ${getNotificationType(
                    notification
                  )}`}
                >
                  <div className="notification-header-row">
                    <span
                      className={`notification-type ${getNotificationType(
                        notification
                      )}`}
                    >
                      {getNotificationType(notification).replace("_", " ")}
                    </span>
                  </div>
                  <div className="notification-message">
                    {notification.message || notification.command}
                  </div>
                  <div className="notification-meta">
                    <span className="meta-item">
                      
                    </span>
                    <span className="meta-item">
                      Role: {notification.role || "system"}
                    </span>
                    {notification.device && (
                      <span className="meta-item">
                        Device: {notification.device}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            <div ref={notificationEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
