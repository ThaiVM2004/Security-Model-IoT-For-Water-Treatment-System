#!/bin/bash

python3 /home/pi/MyUser/user/get-info.py &
PID1=$!

python3 /home/pi/MyUser/user/parse_new_ver.py &
PID2=$!

echo "Sensor PID: $PID1"
echo "MQTT PID:   $PID2"

wait $PID1
wait $PID2

echo "All process are stoped"
