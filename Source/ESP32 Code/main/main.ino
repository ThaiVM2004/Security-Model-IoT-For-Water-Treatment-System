#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>


const char* ssid = "HOBAHOME TRET2";
const char* password = "12345678";
const char* mqtt_server = "192.168.1.115";
const int   mqtt_port  = 1883;

const char* mqtt_sub_topic   = "iot/control";
const char* mqtt_pub_sensor1 = "iot/sensor1";
const char* mqtt_pub_sensor2 = "iot/sensor2";

WiFiClient espClient;
PubSubClient client(espClient);


HardwareSerial UART_CMD(2);

HardwareSerial UART_SENSOR(1);

String uartSensorBuffer = "";

int mapWaterLevel(int distanceCm)
{

    
    const int EMPTY_DISTANCE = 12.5;  
    const int FULL_DISTANCE  = 1;   
    

    if (distanceCm >= EMPTY_DISTANCE) return 0;
    if (distanceCm <= FULL_DISTANCE)  return 100;
    
    int percentage = map(distanceCm, EMPTY_DISTANCE, FULL_DISTANCE, 0, 100);
    
    if (percentage < 0)   percentage = 0;
    if (percentage > 100) percentage = 100;
    
    return percentage;
}

void callback(char* topic, byte* payload, unsigned int length)
{
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, payload, length)) return;

    const char* device = doc["device"];
    const char* action = doc["action"];
    if (!device || !action) return;

    char cmd[64];
    snprintf(cmd, sizeof(cmd), "%s/%s\n", device, action);

    Serial.print("TX → STM32 (UART2): ");
    Serial.print(cmd);

    UART_CMD.print(cmd);
}

void reconnect()
{
    while (!client.connected())
    {
        Serial.print("MQTT connecting... ");

        if (client.connect("ESP32-UART-HUB"))
        {
            Serial.println("OK");
            client.subscribe(mqtt_sub_topic);
        }
        else
        {
            Serial.print("Failed, rc=");
            Serial.println(client.state());
            delay(2000);
        }
    }
}

void publishSensorData(String raw)
{
    StaticJsonDocument<256> doc;

    if (raw.startsWith("SENSOR1:"))
    {
        float temp = 0;
        int   waterRaw = 0;  
        float tds  = 0;

        int t1 = raw.indexOf("TEMP:");
        int t2 = raw.indexOf(";WATER:");
        int t3 = raw.indexOf(";TDS:");

        if (t1 < 0 || t2 < 0 || t3 < 0) return;

        temp     = raw.substring(t1 + 5, t2).toFloat();
        waterRaw = raw.substring(t2 + 7, t3).toInt();
        tds      = raw.substring(t3 + 5).toFloat();

  
        int waterPercent = mapWaterLevel(waterRaw);

        doc["temp"]  = temp;
        doc["water"] = waterPercent;  
        doc["tds"]   = tds;

        char jsonOut[128];
        serializeJson(doc, jsonOut);

        Serial.print("MQTT publish → SENSOR1:");
        Serial.println(jsonOut);

        client.publish(mqtt_pub_sensor1, jsonOut);
        return;
    }

    if (raw.startsWith("SENSOR2:"))
    {
        float temp = 0;
        int   waterRaw = 0;  
        float tds  = 0;
        float ph   = 0;

        int t1 = raw.indexOf("TEMP:");
        int t2 = raw.indexOf(";WATER:");
        int t3 = raw.indexOf(";TDS:");
        int t4 = raw.indexOf(";PH:");

        if (t1 < 0 || t2 < 0 || t3 < 0 || t4 < 0) return;

        temp     = raw.substring(t1 + 5, t2).toFloat();
        waterRaw = raw.substring(t2 + 7, t3).toInt();
        tds      = raw.substring(t3 + 5, t4).toFloat();
        ph       = raw.substring(t4 + 4).toFloat();


        int waterPercent = mapWaterLevel(waterRaw);

        doc["temp"]  = temp;
        doc["water"] = waterPercent;  
        doc["tds"]   = tds;
        doc["ph"]    = ph;

        char jsonOut[128];
        serializeJson(doc, jsonOut);

        Serial.print("MQTT publish → SENSOR2:");
        Serial.println(jsonOut);

        client.publish(mqtt_pub_sensor2, jsonOut);
        return;
    }
}


void setup()
{
    Serial.begin(115200);

    
    UART_CMD.begin(115200, SERIAL_8N1, 26, 27); 
    Serial.println("UART2 Ready (Commands → STM32)");

   
    UART_SENSOR.begin(9600, SERIAL_8N1, 12, 14);
    Serial.println("UART1 Ready (Sensor from STM32)");

    
    Serial.print("WiFi connecting...");
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.print(".");
        delay(300);
    }
    Serial.println("\nWiFi OK");

    
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
    reconnect();
}


void loop()
{
    if (!client.connected()) reconnect();
    client.loop();

    
    while (UART_SENSOR.available())
    {
        char c = UART_SENSOR.read();

        if (c == '\n' || c == '\r')
        {
            if (uartSensorBuffer.length() > 0)
            {
                Serial.print("STM32 UART1 → ");
                Serial.println(uartSensorBuffer);

                publishSensorData(uartSensorBuffer);

                uartSensorBuffer = "";
            }
        }
        else
        {
            if (uartSensorBuffer.length() < 256)
                uartSensorBuffer += c;
        }
    }
}