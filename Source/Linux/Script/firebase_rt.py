#!/usr/bin/env python3
"""
MQTT to Firebase Data Logger for IoT Sensors
Receives data from iot/sensor1 and iot/sensor2 topics
Stores timestamped data in Firebase Realtime Database
"""

import paho.mqtt.client as mqtt
import firebase_admin
from firebase_admin import credentials, db
import json
from datetime import datetime
import time
import sys

# ==================== CONFIGURATION ====================

# MQTT Configuration
MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TOPICS = [
    ("iot/sensor1", 0),
    ("iot/sensor2", 0)
]

# Firebase Configuration
FIREBASE_CRED_PATH = "serviceAccountKey.json"  # Đường dẫn đến file credentials
FIREBASE_DB_URL = "https://fir-b847c-default-rtdb.asia-southeast1.firebasedatabase.app/"  # URL Firebase database

# Data structure mapping - Map sensor1 -> user1, sensor2 -> user2
SENSOR_TO_USER = {
    "sensor1": "user1",
    "sensor2": "user2"
}

# Metric name mapping
METRIC_NAMES = {
    "temp": "temperature",
    "water": "water_level",
    "tds": "turbidity",  # ✅ Đổi tds → turbidity
    "ph": "ph"
}

# History field name mapping (field name in history/)
HISTORY_FIELD_NAMES = {
    "temperature": "temp",
    "water_level": "level",
    "turbidity": "turbidity",
    "ph": "ph"
}

# ==================== FIREBASE INIT ====================

def init_firebase():
    """Initialize Firebase connection"""
    try:
        cred = credentials.Certificate(FIREBASE_CRED_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_DB_URL
        })
        print("✅ Firebase initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        return False

# ==================== FIREBASE OPERATIONS ====================

def push_to_firebase(user_id, metric_name, value, timestamp):
    """
    Push data to Firebase with timestamp
    
    Args:
        user_id: "user1" or "user2"
        metric_name: "temperature", "water_level", "turbidity", "ph"
        value: Sensor value (float/int)
        timestamp: ISO timestamp string
    
    Structure:
        user1/water_level/history/1763395224/level: 21
        user1/temperature/history/1763395224/temp: 30.5
    """
    try:
        # Path: userX/metric_name/history/
        path = f"{user_id}/{metric_name}/history"
        ref = db.reference(path)
        
        # Get field name for history (e.g., "level" for water_level, "temp" for temperature)
        field_name = HISTORY_FIELD_NAMES.get(metric_name, "value")
        
        # Use unix timestamp as key
        unix_time = int(time.time())
        
        data = {
            field_name: value  # e.g., "level": 21 or "temp": 30.5
        }
        
        # Push with unix timestamp as key
        ref.child(str(unix_time)).set(data)
        
        print(f"  ✓ {user_id}/{metric_name}/history/{unix_time}/{field_name}: {value}")
        return True
        
    except Exception as e:
        print(f"  ✗ Firebase push error [{path}]: {e}")
        return False

def update_latest_value(user_id, metric_name, value):
    """
    Update current value in Firebase
    
    Args:
        user_id: "user1" or "user2"
        metric_name: "temperature", "water_level", "turbidity", "ph"
        value: Current value
    """
    try:
        # Path: userX/metric_name/current
        path = f"{user_id}/{metric_name}/current"
        ref = db.reference(path)
        
        # Just set the value directly
        ref.set(value)
        
        print(f"  ✓ {user_id}/{metric_name}/current: {value}")
        return True
        
    except Exception as e:
        print(f"  ✗ Current update error: {e}")
        return False

# ==================== MQTT CALLBACKS ====================

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print("✅ Connected to MQTT broker")
        
        # Subscribe to topics
        for topic, qos in MQTT_TOPICS:
            client.subscribe(topic)
            print(f"📡 Subscribed to: {topic}")
    else:
        print(f"❌ MQTT connection failed with code: {rc}")

def on_disconnect(client, userdata, rc):
    """Callback when disconnected from MQTT broker"""
    if rc != 0:
        print(f"⚠️ Unexpected MQTT disconnect. Reconnecting...")

def on_message(client, userdata, msg):
    """
    Callback when message received from MQTT
    
    Message format:
    - sensor1: {"temp": 30.5, "water": 86, "tds": 152.3}
    - sensor2: {"temp": 29.1, "water": 45, "tds": 98.5, "ph": 7.2}
    
    Firebase structure:
    - user1/temperature/current: 30.5
    - user1/temperature/history/1763395224/temp: 30.5
    - user1/water_level/current: 2
    - user1/water_level/history/1763395224/level: 21
    - user1/turbidity/current: 152.3
    - user1/turbidity/history/1763395224/turbidity: 152.3
    - user2/ph/current: 7.2
    - user2/ph/history/1763395224/ph: 7.2
    """
    try:
        # Decode message
        payload = msg.payload.decode('utf-8')
        data = json.loads(payload)
        
        # Get sensor ID from topic
        if "sensor1" in msg.topic:
            sensor_id = "sensor1"
        elif "sensor2" in msg.topic:
            sensor_id = "sensor2"
        else:
            print(f"⚠️ Unknown topic: {msg.topic}")
            return
        
        # Map sensor to user
        user_id = SENSOR_TO_USER[sensor_id]
        
        # Generate timestamp
        timestamp = datetime.now().isoformat()
        
        print(f"\n📥 Received from {msg.topic} → {user_id}:")
        print(f"   Data: {json.dumps(data, indent=2)}")
        
        # Process each metric
        for metric_short, value in data.items():
            # Get full metric name
            if metric_short not in METRIC_NAMES:
                print(f"  ⚠️ Unknown metric: {metric_short}")
                continue
            
            metric_name = METRIC_NAMES[metric_short]
            
            # Push to history: userX/metric_name/history/unix_timestamp/field_name
            push_to_firebase(user_id, metric_name, value, timestamp)
            
            # Update current value: userX/metric_name/current
            update_latest_value(user_id, metric_name, value)
        
        print(f"✅ {user_id} data logged successfully\n")
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        print(f"   Raw payload: {msg.payload}")
        
    except Exception as e:
        print(f"❌ Message processing error: {e}")
        import traceback
        traceback.print_exc()

# ==================== MAIN ====================

def main():
    """Main function"""
    print("=" * 60)
    print("🚀 MQTT to Firebase Data Logger")
    print("=" * 60)
    
    # Initialize Firebase
    if not init_firebase():
        print("❌ Cannot start without Firebase connection")
        sys.exit(1)
    
    # Initialize MQTT client
    client = mqtt.Client(client_id="RaspberryPi-Logger", clean_session=True)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    # Connect to MQTT broker
    try:
        print(f"\n🔌 Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        
        # Start MQTT loop
        print("🔄 Starting MQTT loop...\n")
        client.loop_forever()
        
    except KeyboardInterrupt:
        print("\n\n⏹️ Stopping logger...")
        client.disconnect()
        print("👋 Goodbye!")
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()