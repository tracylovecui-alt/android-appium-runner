const path = require('path');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { runAndroidAutomation, DEFAULT_CONFIG } = require('../src/automation');

let mainWindow = null;
let isRunning = false;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('dialog:pick-apk', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Android APK', extensions: ['apk'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return '';
  }

  return result.filePaths[0];
});

ipcMain.handle('automation:get-default-config', async () => {
  return DEFAULT_CONFIG;
});

ipcMain.handle('automation:run', async (_event, config) => {
  if (isRunning) {
    return {
      ok: false,
      error: '已有任务在执行，请稍候'
    };
  }

  isRunning = true;
  sendToRenderer('automation:state', { running: true });

  try {
    await runAndroidAutomation(config, {
      log: (line) => sendToRenderer('automation:log', line)
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  } finally {
    isRunning = false;
    sendToRenderer('automation:state', { running: false });
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
