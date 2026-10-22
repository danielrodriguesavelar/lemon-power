#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// A placa cria uma rede local; o aplicativo web se conecta ao endereço do ESP8266.
const char *WIFI_NAME = "LemonPower";
const char *WIFI_PASSWORD = "lemonpower";
const IPAddress ACCESS_POINT_IP(192, 168, 4, 1);
const IPAddress ACCESS_POINT_GATEWAY(192, 168, 4, 1);
const IPAddress ACCESS_POINT_SUBNET(255, 255, 255, 0);

// No NodeMCU ESP-12E Amica, D6 corresponde ao GPIO12.
const uint8_t LED_CONTROL_PIN = D6;

ESP8266WebServer server(80);
bool ledIsOn = false;
bool networkReady = false;

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
  server.sendHeader("Cache-Control", "no-store");
}

void sendJson(int statusCode, const String &body) {
  addCorsHeaders();
  server.send(statusCode, "application/json; charset=utf-8", body);
}

void handleStatus() {
  sendJson(200, String("{\"state\":\"") + (ledIsOn ? "ON" : "OFF") + "\"}");
}

void handleLedCommand() {
  String command = server.arg("plain");
  command.trim();

  if (command != "ON" && command != "OFF") {
    sendJson(400, "{\"error\":\"Comando invalido. Use ON ou OFF.\"}");
    return;
  }

  ledIsOn = command == "ON";
  digitalWrite(LED_CONTROL_PIN, ledIsOn ? HIGH : LOW);
  Serial.println(ledIsOn ? "LED:ON confirmado" : "LED:OFF confirmado");
  handleStatus();
}

void handleOptions() {
  addCorsHeaders();
  server.send(204);
}

void handleNotFound() {
  sendJson(404, "{\"error\":\"Rota nao encontrada.\"}");
}

void setup() {
  Serial.begin(115200);

  pinMode(LED_CONTROL_PIN, OUTPUT);
  digitalWrite(LED_CONTROL_PIN, LOW);

  WiFi.mode(WIFI_AP);
  if (!WiFi.softAPConfig(ACCESS_POINT_IP, ACCESS_POINT_GATEWAY, ACCESS_POINT_SUBNET)) {
    Serial.println("Erro ao configurar o endereco da rede LemonPower.");
    return;
  }
  if (!WiFi.softAP(WIFI_NAME, WIFI_PASSWORD)) {
    Serial.println("Erro ao iniciar o ponto de acesso LemonPower.");
    return;
  }

  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/led", HTTP_POST, handleLedCommand);
  server.on("/api/led", HTTP_OPTIONS, handleOptions);
  server.onNotFound(handleNotFound);
  server.begin();
  networkReady = true;

  Serial.println("Ponto de acesso LemonPower iniciado.");
  Serial.print("Rede Wi-Fi: ");
  Serial.println(WIFI_NAME);
  Serial.print("Endereco do controle: http://");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  if (!networkReady) {
    delay(1000);
    return;
  }

  server.handleClient();
  delay(2);
}
