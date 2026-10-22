const API_BASE_URL = "http://192.168.4.1";
const REQUEST_TIMEOUT_MS = 3000;
const STATUS_POLL_INTERVAL_MS = 4000;

const connectButton = document.querySelector("#connect-button");
const connectionPill = document.querySelector("#connection-pill");
const connectionLabel = document.querySelector("#connection-label");
const turnOnButton = document.querySelector("#turn-on-button");
const turnOffButton = document.querySelector("#turn-off-button");
const ledIcon = document.querySelector("#led-icon");
const ledState = document.querySelector("#led-state");
const message = document.querySelector("#message");
const simulationButton = document.querySelector("#simulation-button");
const simulationDescription = document.querySelector("#simulation-description");
const simulationNotice = document.querySelector("#simulation-notice");
const simulationDemo = document.querySelector("#simulation-demo");
const simulationLedIcon = document.querySelector("#simulation-led-icon");
const simulationLedState = document.querySelector("#simulation-led-state");

let commandPending = false;
let statusCheckPending = false;
let simulationMode = false;
let simulatedLedOn = false;
let statusPoll = null;

function setMessage(text, kind = "") {
  message.textContent = text;
  message.dataset.kind = kind;
}

function setConnectionState(connected, label) {
  connectionPill.dataset.state = connected ? "connected" : "disconnected";
  connectionLabel.textContent = label;
  turnOnButton.disabled = !connected || commandPending;
  turnOffButton.disabled = !connected || commandPending;
  connectButton.disabled = statusCheckPending;
}

function setPhysicalLedState(state) {
  ledIcon.dataset.state = state;
  if (state === "on") {
    ledState.textContent = "Ligado · confirmado pelo NodeMCU";
  } else if (state === "off") {
    ledState.textContent = "Desligado · confirmado pelo NodeMCU";
  } else {
    ledState.textContent = "Aguardando confirmação";
  }
}

async function requestApi(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`O NodeMCU respondeu com o código ${response.status}.`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function readConfirmedState(result) {
  if (result.state !== "ON" && result.state !== "OFF") {
    throw new Error("O NodeMCU enviou uma confirmação inválida.");
  }
  return result.state;
}

function setDisconnected(messageText, kind = "") {
  window.clearInterval(statusPoll);
  statusPoll = null;
  setConnectionState(false, "Desconectado");
  setPhysicalLedState("unknown");
  if (messageText) {
    setMessage(messageText, kind);
  }
}

async function connectToDevice() {
  if (statusCheckPending) {
    return;
  }

  statusCheckPending = true;
  setConnectionState(false, "Verificando...");
  connectButton.disabled = true;
  setMessage("Verificando a conexão Wi-Fi com LemonPower...");

  try {
    const result = await requestApi("/api/status");
    const confirmedState = readConfirmedState(result);
    setPhysicalLedState(confirmedState === "ON" ? "on" : "off");
    setConnectionState(true, "Conectado por Wi-Fi");
    setMessage("Conectado ao NodeMCU LemonPower. Estado sincronizado.", "success");
    if (!statusPoll) {
      statusPoll = window.setInterval(checkConnection, STATUS_POLL_INTERVAL_MS);
    }
  } catch (error) {
    setDisconnected(
      `Não foi possível acessar o NodeMCU: ${error.message} Confira se está na rede LemonPower.`,
      "error"
    );
  } finally {
    statusCheckPending = false;
    connectButton.disabled = false;
  }
}

async function checkConnection() {
  if (statusCheckPending || commandPending) {
    return;
  }

  statusCheckPending = true;
  try {
    const result = await requestApi("/api/status");
    const confirmedState = readConfirmedState(result);
    setPhysicalLedState(confirmedState === "ON" ? "on" : "off");
    if (connectionPill.dataset.state !== "connected") {
      setConnectionState(true, "Conectado por Wi-Fi");
      setMessage("Conexão Wi-Fi com o NodeMCU restabelecida.", "success");
    }
  } catch (error) {
    if (connectionPill.dataset.state === "connected") {
      setDisconnected("Conexão com o NodeMCU perdida. Reconecte-se à rede LemonPower.", "error");
    }
  } finally {
    statusCheckPending = false;
    connectButton.disabled = false;
  }
}

async function sendCommand(command) {
  if (connectionPill.dataset.state !== "connected") {
    setMessage("Conecte-se à rede Wi-Fi LemonPower e verifique o NodeMCU antes de controlar o LED.", "error");
    return;
  }
  if (commandPending) {
    return;
  }

  commandPending = true;
  turnOnButton.disabled = true;
  turnOffButton.disabled = true;
  setMessage(`Enviando ${command} e aguardando confirmação do NodeMCU...`);

  try {
    const result = await requestApi("/api/led", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: command
    });
    const confirmedState = readConfirmedState(result);
    if (confirmedState !== command) {
      throw new Error("O NodeMCU confirmou um estado diferente do solicitado.");
    }
    setPhysicalLedState(confirmedState === "ON" ? "on" : "off");
    setMessage(`Comando confirmado: LED ${confirmedState === "ON" ? "ligado" : "desligado"}.`, "success");
  } catch (error) {
    setDisconnected(`Não foi possível confirmar o comando: ${error.message}`, "error");
  } finally {
    commandPending = false;
    const connected = connectionPill.dataset.state === "connected";
    turnOnButton.disabled = !connected;
    turnOffButton.disabled = !connected;
  }
}

function updateSimulation() {
  simulationMode = !simulationMode;
  simulationDescription.textContent = simulationMode
    ? "Use os controles abaixo para demonstrar o estado, sem acionar um LED real."
    : "Demonstre a interface sem se conectar a um dispositivo real.";
  simulationButton.textContent = simulationMode ? "Encerrar demonstração" : "Iniciar demonstração";
  simulationNotice.hidden = !simulationMode;
  simulationDemo.hidden = !simulationMode;
  if (simulationMode) {
    simulatedLedOn = false;
    updateSimulatedLed();
    setMessage("Demonstração ativada. Os controles físicos só funcionam com o NodeMCU conectado por Wi-Fi.");
  } else {
    setMessage(connectionPill.dataset.state === "connected"
      ? "Demonstração encerrada. O controle físico está disponível."
      : "Demonstração encerrada. Conecte-se ao LemonPower para controlar o circuito.");
  }
}

function updateSimulatedLed() {
  simulationLedIcon.dataset.state = simulatedLedOn ? "on" : "off";
  simulationLedState.textContent = `Simulação: LED ${simulatedLedOn ? "ligado" : "desligado"}`;
}

connectButton.addEventListener("click", connectToDevice);
turnOnButton.addEventListener("click", () => sendCommand("ON"));
turnOffButton.addEventListener("click", () => sendCommand("OFF"));
simulationButton.addEventListener("click", updateSimulation);
document.querySelector("#simulate-on-button").addEventListener("click", () => {
  simulatedLedOn = true;
  updateSimulatedLed();
});
document.querySelector("#simulate-off-button").addEventListener("click", () => {
  simulatedLedOn = false;
  updateSimulatedLed();
});
