const path = require("node:path");
const { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut } = require("electron");
const { createMonitor } = require("./monitor");
const { PetStateMachine } = require("./state-machine");

let mainWindow = null;
let tray = null;
let monitor = null;
const visibilityShortcut = "CommandOrControl+Y";

const stateMachine = new PetStateMachine({ doneDurationMs: 2800 });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 220,
    height: 220,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.show();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function togglePetVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, "../../assets/tray.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("ClaudePet");

  const menu = Menu.buildFromTemplate([
    {
      label: "Show/Hide Pet",
      click: togglePetVisibility
    },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);
  tray.setContextMenu(menu);
}

function startMonitoring() {
  monitor = createMonitor();

  monitor.on("activity", ({ state, detail }) => {
    stateMachine.setState(state, detail || "");
  });
  monitor.on("unavailable", (reason) => {
    stateMachine.setState("IDLE", reason);
  });
  monitor.on("error", () => {
    stateMachine.setState("IDLE", "monitor-error");
  });

  stateMachine.on("state-change", (payload) => {
    if (mainWindow?.webContents) {
      mainWindow.webContents.send("pet-state", payload);
    }
  });

  monitor.start();
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startMonitoring();
  globalShortcut.register(visibilityShortcut, togglePetVisibility);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  monitor?.stop();
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
