/***********************Required Libraries************************************/
#include <DHT.h>          // for temperature and Humidity sensor
#include <ESP8266WiFi.h>  // for NodeMCU
//#include <MQUnifiedsensor.h>  // for MQ GAS sensor
#include <WiFiClient.h>

/***********************Pin Configuration************************************/
#define DHTPIN 2   // Digital input pin for DHT11 sensor
#define GASPIN A0  // Analog input pin for MQ-2 gas sensor

/***********************MQ GAS Sensor Configuration************************************/
#define THRESHOLD 300  // Gas level threshold for alert
//MQUnifiedsensor mq2("MQ-2", GASPIN);

/*****************************DHT11 Configuration***********************************************/
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
//#define MIN_TEMP 0    // Minimum temperature in Celsius for alert
//#define MAX_TEMP 10   // Maximum temperature in Celsius for alert
//#define MIN_HUMID 20  // Minimum humidity level in percentage for alert
//#define MAX_HUMID 80  // Maximum humidity level in percentage for alert

/*****************************Wifi and Server Configuration***********************************************/
const char* ssid = "Mi 10i";          // wifi name
const char* password = "1234567881";  // wifi password
const char* host = "192.168.176.61";   // host IP address
const int port = 3000;                // port number
WiFiClient client;

/*****************************Setup function***********************************************/
void setup() {
  Serial.begin(9600);

  dht.begin();
  //mq2.setRegressionMethod(1);

  WiFi.begin(ssid, password);
  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println(WiFi.localIP());
}

/*****************************loop function***********************************************/
void loop() {
  delay(1000);

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  //float r = mq2.readSensor();
  //int r = analogRead(GASPIN);
  float r = 220 * (analogRead(A0) / 1023.0) / 4.0;
  //220 is the sensitivity factor of the MQ-2 sensor for methane, and 4.0 is the default value for the load resistance of the sensor

  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  if (isnan(r)) {
    Serial.println("Failed to read from MQ sensor!");
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(t);
  Serial.print(" °C | Humidity: ");
  Serial.print(h);
  Serial.print(" % | Gas: ");
  Serial.print(r);
  Serial.println(" ppm");

  if (r > THRESHOLD) {
    Serial.println("Gas level is high. Alert!");
  }

  /*if (t < MIN_TEMP || t > MAX_TEMP) {
    Serial.println("Temperature is out of range. Alert!");
  }

  if (h < MIN_HUMID || h > MAX_HUMID) {
    Serial.println("Humidity level is out of range. Alert!");
  }*/

  if (client.connect(host, port)) {
    Serial.println("Sending data to server...");
    String data = "temperature=" + String(t) + "&humidity=" + String(h) + "&gas=" + String(r);
    client.println("POST /data HTTP/1.1");
    client.println("Host: " + String(host) + ":" + String(port));
    client.println("Content-Type: application/x-www-form-urlencoded");
    client.print("Content-Length: ");
    client.println(data.length());
    client.println();
    client.print(data);
    client.println();
    client.stop();
  } else {
    Serial.println("Failed to connect to server!");
  }
}
