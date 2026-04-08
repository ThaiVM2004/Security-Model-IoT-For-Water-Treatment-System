# 🔒 Security Model IoT for Water Treatment System

A multi-layered IoT security system for real-time water treatment monitoring and control. The project integrates embedded sensors, a network firewall, cloud services, and a web dashboard with role-based access control (RBAC) to securely supervise water quality across collection and discharge tanks.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Hardware Components](#hardware-components)
- [Software Stack](#software-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [STM32 Firmware](#stm32-firmware)
  - [ESP32 Firmware](#esp32-firmware)
  - [Raspberry Pi Gateway](#raspberry-pi-gateway)
  - [Web Application](#web-application)
- [Security Features](#security-features)
- [Sensors & Measurements](#sensors--measurements)
- [Communication Protocols](#communication-protocols)
- [License](#license)

---

## Overview

This system monitors and controls a water treatment facility through four interconnected layers:

| Layer | Hardware | Role |
|-------|----------|------|
| **Sensor** | STM32F1 + Sensors | Reads temperature, water level, TDS, and pH |
| **Gateway** | ESP32 | Bridges UART sensor data to MQTT over WiFi |
| **Edge Server** | Raspberry Pi | Runs a kernel-level firewall, syncs data to Firebase, and enforces RBAC for commands |
| **Dashboard** | Browser (React) | Provides real-time monitoring, alerting, and device control |

---

## System Architecture

```
┌──────────────┐   UART    ┌──────────────┐   MQTT    ┌─────────────────────────┐
│  STM32F1     │ ────────► │  ESP32       │ ────────► │  Raspberry Pi           │
│  (Sensors +  │ ◄──────── │  (WiFi/MQTT  │ ◄──────── │  ┌─────────────────┐    │
│   Actuators) │  Commands │   Gateway)   │  Control  │  │ Kernel Firewall │    │
└──────────────┘           └──────────────┘           │  └─────────────────┘    │
                                                      │  ┌─────────────────┐    │
                                                      │  │ firebase_rt.py  │───►│ Firebase
                                                      │  │ (Sensor → DB)   │    │ (Realtime DB
                                                      │  └─────────────────┘    │  + Firestore
                                                      │  ┌─────────────────┐    │  + Auth)
                                                      │  │ parse_new_ver.py│◄───│
                                                      │  │ (RBAC Commands) │    │
                                                      │  └─────────────────┘    │
                                                      │  ┌─────────────────┐    │
                                                      │  │ get-info.py     │◄───│
                                                      │  │ (User Sync)     │    │
                                                      │  └─────────────────┘    │
                                                      └─────────────────────────┘
                                                                 ▲
                                                                 │ HTTP / Firebase SDK
                                                                 ▼
                                                      ┌─────────────────────────┐
                                                      │  React Web Dashboard    │
                                                      │  + Node.js Backend      │
                                                      │  (Admin / User1 / User2)│
                                                      └─────────────────────────┘
```

---

## Hardware Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Microcontroller | STM32F103 | Sensor acquisition & actuator control via FreeRTOS |
| WiFi/MQTT Gateway | ESP32 | Bridges UART ↔ MQTT over WiFi |
| Edge Server | Raspberry Pi (64-bit) | Runs firewall, Python scripts, MQTT broker |
| Temperature Sensor | DS18B20 | 1-Wire digital thermometer (−55 °C to +125 °C) |
| Water Level Sensor | HC-SR04 | Ultrasonic distance → water level percentage |
| TDS Sensor | Analog probe | Total Dissolved Solids / turbidity measurement |
| pH Sensor | Analog electrode | pH 0–14, two-point calibration (pH 4.0 & 9.0) |
| Actuators | Pumps, valves, fans, bulbs | 8 controllable devices (4 per treatment unit) |

---

## Software Stack

| Layer | Technologies |
|-------|-------------|
| STM32 Firmware | C, STM32 HAL, FreeRTOS (CMSIS-OS), ADC, UART, Timers |
| ESP32 Firmware | Arduino (C++), WiFi, PubSubClient (MQTT), ArduinoJson |
| Linux / Gateway | Python 3, paho-mqtt, firebase-admin SDK, SQLite 3, Bash |
| Kernel Security | C, Linux Netfilter framework, kernel module (`.ko`) |
| Frontend | React 19, React Router 7, Firebase JS SDK, Recharts, Tabler Icons, Lucide |
| Backend | Node.js, Express.js, Axios, CORS |
| Cloud | Firebase Authentication, Firestore, Realtime Database |
| PCB Design | KiCad (schematic + PCB layout) |

---

## Repository Structure

```
├── Circuit/
│   ├── main_circuit.kicad_sch      # KiCad schematic
│   ├── main_pcb.kicad_pcb          # KiCad PCB layout
│   └── fab.zip                     # Fabrication files
│
├── Source/
│   ├── STM32 Code/
│   │   ├── Config/main.ioc         # STM32CubeMX project file
│   │   ├── Inc/                    # Header files (main.h, sensor headers, FreeRTOS config)
│   │   └── Src/
│   │       ├── main.c              # Core: FreeRTOS tasks, UART, device control
│   │       ├── pH.c                # pH sensor driver (two-point calibration)
│   │       ├── temp.c              # DS18B20 temperature driver (1-Wire via UART)
│   │       ├── turbidity.c         # TDS/turbidity driver (ADC + polynomial)
│   │       ├── water_level.c       # HC-SR04 ultrasonic driver (timer capture)
│   │       └── freertos.c          # FreeRTOS kernel configuration
│   │
│   ├── ESP32 Code/
│   │   └── main/main.ino           # WiFi + MQTT gateway, UART ↔ JSON bridge
│   │
│   ├── Linux/
│   │   ├── Kernel Module/
│   │   │   ├── nf_kernel.c         # Netfilter firewall (whitelist ports)
│   │   │   └── Makefile            # Kernel module build for Raspberry Pi
│   │   └── Script/
│   │       ├── firebase_rt.py      # MQTT subscriber → Firebase Realtime DB
│   │       ├── get-info.py         # Firestore → SQLite user sync
│   │       ├── parse_new_ver.py    # RBAC command processor (Firestore → MQTT)
│   │       └── run_process.sh      # Process orchestrator
│   │
│   └── Web Code/
│       └── superviso-ui/
│           ├── backend/server.js   # Express.js proxy to Raspberry Pi
│           ├── src/
│           │   ├── App.js          # React router & layout
│           │   ├── LoginForm/      # Firebase authentication UI
│           │   ├── Register/       # User registration with role selection
│           │   ├── Admin/          # Admin dashboard (system health + alerts)
│           │   └── Dashboard/      # User dashboards (sensor data + device control)
│           └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **STM32:** STM32CubeIDE or compatible ARM toolchain
- **ESP32:** Arduino IDE with ESP32 board package
- **Raspberry Pi:** Raspberry Pi OS (64-bit), Python 3, Mosquitto MQTT broker
- **Web:** Node.js ≥ 18, npm
- **Cloud:** Firebase project with Authentication, Firestore, and Realtime Database enabled

### STM32 Firmware

1. Open `Source/STM32 Code/Config/main.ioc` in STM32CubeMX to review pin configuration.
2. Build the project with STM32CubeIDE using the files in `Src/` and `Inc/`.
3. Flash the firmware to the STM32F103 board.

### ESP32 Firmware

1. Open `Source/ESP32 Code/main/main.ino` in Arduino IDE.
2. Install required libraries: **PubSubClient**, **ArduinoJson**, **WiFi**.
3. Update WiFi SSID/password and MQTT broker IP in the sketch.
4. Upload to the ESP32 board.

### Raspberry Pi Gateway

```bash
# Install system dependencies
sudo apt update && sudo apt install -y mosquitto mosquitto-clients python3-pip

# Install Python packages
pip3 install paho-mqtt firebase-admin

# Build and load the kernel firewall module
cd Source/Linux/Kernel\ Module
make
sudo insmod nf_kernel.ko

# Start the data pipeline
cd ../Script
bash run_process.sh
```

### Web Application

```bash
cd Source/Web\ Code/superviso-ui

# Install dependencies
npm install

# Start the backend proxy
cd backend && node server.js &

# Start the React development server
cd .. && npm start
```

The dashboard will be available at `http://localhost:3000`.

---

## Security Features

| Feature | Implementation | Layer |
|---------|---------------|-------|
| **Network Firewall** | Linux kernel Netfilter module with port whitelist (22, 53, 443, 1883, 67/68) | Kernel |
| **Default-Deny Policy** | Only whitelisted ports and established TCP connections are accepted | Kernel |
| **Authentication** | Firebase Authentication (email/password) | Cloud / Web |
| **Role-Based Access Control** | Admin, User1, User2 roles verified against SQLite DB before command execution | Edge Server |
| **Command Verification** | Commands parsed and validated (`db/user/role/device/action`) before MQTT dispatch | Edge Server |
| **Audit Trail** | Processed flags, timestamps, and error messages stored in Firestore | Cloud |
| **Firewall Logging** | All accepted/dropped packets logged via kernel `pr_info()` | Kernel |

---

## Sensors & Measurements

| Sensor | Parameter | Range | Technique |
|--------|-----------|-------|-----------|
| DS18B20 | Temperature | −55 °C to +125 °C | 1-Wire protocol via UART half-duplex |
| HC-SR04 | Water Level | 0–100 % (1–12.5 cm distance) | Ultrasonic time-of-flight, timer input capture |
| TDS Probe | Turbidity | 0–1000+ ppm | ADC median filter + polynomial compensation |
| pH Electrode | pH | 0–14 | ADC with two-point calibration (pH 4.0 / 9.0) |

Alert thresholds (QCVN 40:2011 — Vietnamese water quality standard):

- **pH:** 6.5–8.5
- **Temperature:** 15–35 °C
- **Turbidity:** Warning at 250 ppm, Critical at 350 ppm
- **Water Level:** 30–80 %

---

## Communication Protocols

| Protocol | Usage | Details |
|----------|-------|---------|
| UART | STM32 ↔ ESP32 | 115200 baud (commands), 9600 baud (sensor data) |
| MQTT | ESP32 ↔ Broker ↔ RPi | Topics: `iot/sensor1`, `iot/sensor2`, `iot/control` |
| 1-Wire | STM32 ↔ DS18B20 | Temperature reads via UART half-duplex |
| ADC | STM32 ↔ TDS/pH | Analog sampling with median filter |
| HTTP | Web ↔ Backend ↔ RPi | Express.js proxy for registration notifications |
| WebSocket | Web ↔ Firebase | Real-time sensor data via Firebase Realtime DB |

---

## License

This project is developed for academic and research purposes.

