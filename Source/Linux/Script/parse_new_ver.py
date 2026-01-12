import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import sqlite3
import time
import paho.mqtt.client as mqtt
import json

MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TOPIC = "iot/control"

DB_PATH = "users.db"
SQLITE_TIMEOUT = 10

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
print("Firebase connected")

# Initialize SQLite
conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=SQLITE_TIMEOUT)
cursor = conn.cursor()

cursor.execute("""
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='users'
""")
if not cursor.fetchone():
    print("Table of 'users' didn't exist into SQLite!")
    print("Let running get-info.py before to create users")
    exit(1)

print(f"SQLite connected at {DB_PATH}")

# Initialize MQTT
mqtt_client = mqtt.Client()


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("MQTT Broker connected")
    else:
        print(f"MQTT connection failed with code {rc}")


def on_publish(client, userdata, mid):
    print(f"Message published to MQTT (mid: {mid})")


mqtt_client.on_connect = on_connect
mqtt_client.on_publish = on_publish

try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
except Exception as e:
    print(f"Didn't connected to MQTT Client: {e}")
    exit(1)


def check_user_permission(username, role):
    """Check user permission from SQLite database"""
    try:
        cursor.execute("""
            SELECT account, role FROM users 
            WHERE account = ? AND processed = 1
        """, (username,))

        result = cursor.fetchone()

        if not result:
            print(f"User '{username}' didn't exist SQLite")
            return False, False

        db_account, db_role = result

        if db_role != role:
            print(f"Doesn't has permission: DB={db_role}, Command={role}")
            return True, False

        print(f"User '{username}' has permission '{role}'")
        return True, True

    except Exception as e:
        print(f"Error when checked permission: {e}")
        return False, False


def send_to_mqtt(device, action, username, role):
    """Send command to MQTT broker"""
    try:
        payload = {
            "device": device,
            "action": action,
        }

        mqtt_client.publish(MQTT_TOPIC, json.dumps(payload))
        print(f"Sent to MQTT: {device}/{action}")
        return True

    except Exception as e:
        print(f"Error when sent to MQTT: {e}")
        return False


def process_command(collection_name, doc_id, data):
    """Process command from Firestore collection"""
    command = data.get("command", "")
    user = data.get("user", "")
    cmd_type = data.get("type", "")

    print(f"\n{'=' * 60}")
    print(f"Collection: {collection_name}")
    print(f"Processing command: {command}")
    print(f"User: {user}")
    print(f"Type: {cmd_type}")

    # Only process command type = "input"
    if cmd_type != "input":
        print("Skipped: Not an input command")
        db.collection(collection_name).document(doc_id).update({
            "processed": True,
            "error": "Invalid command type"
        })
        return False

    # Parse command: db/username/role/device/action
    if not command.startswith("db/"):
        print("Skipped: Invalid command format")
        db.collection(collection_name).document(doc_id).update({
            "processed": True,
            "error": "Invalid command format"
        })
        return False

    parts = command.split("/")
    if len(parts) != 5:
        print("Skipped: Invalid command parts")
        db.collection(collection_name).document(doc_id).update({
            "processed": True,
            "error": "Invalid command structure"
        })
        return False

    _, username, role, device, action = parts

    print(f"Parsed:")
    print(f"   - Username: {username}")
    print(f"   - Role: {role}")
    print(f"   - Device: {device}")
    print(f"   - Action: {action}")

    # Check permission in SQLite
    if role == "admin":
        # Admin cũng phải tồn tại trong database
        exists, has_permission = check_user_permission(username, "admin")
        if not exists:
            print(f"DENIED: Admin user '{username}' không tồn tại trong database")
            db.collection(collection_name).document(doc_id).update({
                "processed": True,
                "error": "Admin user not found",
                "processedAt": firestore.SERVER_TIMESTAMP
            })
            return False
        if not has_permission:
            print(f"DENIED: User '{username}' không có quyền admin")
            db.collection(collection_name).document(doc_id).update({
                "processed": True,
                "error": "Not an admin user",
                "processedAt": firestore.SERVER_TIMESTAMP
            })
            return False
    else:
        exists, has_permission = check_user_permission(username, role)

        # Kiểm tra user có tồn tại không
        if not exists:
            print(f"DENIED: User '{username}' không tồn tại trong database")
            db.collection(collection_name).document(doc_id).update({
                "processed": True,
                "error": "User not found",
                "processedAt": firestore.SERVER_TIMESTAMP
            })
            return False

        # Kiểm tra user có quyền không
        if not has_permission:
            print(f"DENIED: User '{username}' không có quyền '{role}'")
            db.collection(collection_name).document(doc_id).update({
                "processed": True,
                "error": "Permission denied",
                "processedAt": firestore.SERVER_TIMESTAMP
            })
            return False

    print(f"✓ User '{username}' được xác thực với quyền '{role}'")

    # CHỈ GỬI MQTT KHI ĐÃ PASS HẾT KIỂM TRA
    mqtt_success = send_to_mqtt(device, action, username, role)

    if mqtt_success:
        print(f"SUCCESS: Command processed and sent to ESP32")
        # Mark as processed SAU KHI gửi thành công
        db.collection(collection_name).document(doc_id).update({
            "processed": True,
            "sentToMQTT": True,
            "processedAt": firestore.SERVER_TIMESTAMP,
            "sentAt": firestore.SERVER_TIMESTAMP
        })
        return True
    else:
        print(f"FAILED: Didn't send to MQTT")
        db.collection(collection_name).document(doc_id).update({
            "processed": True,
            "sentToMQTT": False,
            "error": "MQTT send failed",
            "processedAt": firestore.SERVER_TIMESTAMP
        })
        return False


# Track processed documents separately for each collection
processed_docs_user1 = set()
processed_docs_user2 = set()


def create_snapshot_handler(collection_name, processed_docs):
    """Create snapshot handler for each collection"""

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            # Only process 'ADDED' events
            if change.type.name == 'ADDED':
                doc_id = change.document.id
                data = change.document.to_dict()

                processed = data.get("processed", False)

                # Check for duplicates
                if doc_id in processed_docs:
                    print(f"Skipped duplicate doc: {doc_id} ({collection_name})")
                    continue

                # Check if already processed
                if processed:
                    print(f"Skipped already processed: {doc_id} ({collection_name})")
                    processed_docs.add(doc_id)
                    continue

                # Process and add to set
                success = process_command(collection_name, doc_id, data)
                processed_docs.add(doc_id)

                if success:
                    time.sleep(0.5)

    return on_snapshot


def main():
    print("=" * 60)
    print("TERMINAL COMMAND PROCESSOR STARTED (DUAL USER)")
    print(f"MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"SQLite DB: {DB_PATH}")
    print(f"Listening for commands from:")
    print(f"  - terminal_commands (user1)")
    print(f"  - terminal_commands_2 (user2)")
    print("=" * 60)

    # Listen to collection for user1
    query_user1 = db.collection("terminal_commands").where("processed", "==", False)
    handler_user1 = create_snapshot_handler("terminal_commands", processed_docs_user1)
    query_watch_user1 = query_user1.on_snapshot(handler_user1)

    # Listen to collection for user2
    query_user2 = db.collection("terminal_commands_2").where("processed", "==", False)
    handler_user2 = create_snapshot_handler("terminal_commands_2", processed_docs_user2)
    query_watch_user2 = query_user2.on_snapshot(handler_user2)

    print("Both collections are now being monitored...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\nStopping...")
        query_watch_user1.unsubscribe()
        query_watch_user2.unsubscribe()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        conn.close()
        print("Stopped gracefully")


if __name__ == "__main__":
    main()