const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { runAndroidAutomation, DEFAULT_CONFIG } = require('../src/automation');

let mainWindow = null;
let isRunning = false;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function getArtifactDir() {
  return path.join(app.getPath('userData'), 'artifacts');
}

function runTool(command, args = [], timeout = 12000) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout, shell: process.platform === 'win32' }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        command: [command, ...args].join(' '),
        output: String(stdout || stderr || '').trim(),
        error: error ? error.message : ''
      });
    });
  });
}

function simplifyCheck(label, result) {
  return {
    label,
    ok: result.ok,
    command: result.command,
    details: result.ok ? result.output : result.error || result.output || '未检测到'
  };
}

function simplifyDeviceCheck(result) {
  const deviceLines = result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\tdevice$/.test(line));

  return {
    label: 'Android 设备',
    ok: result.ok && deviceLines.length > 0,
    command: result.command,
    details: deviceLines.length > 0
      ? deviceLines.join('\n')
      : result.output || result.error || '没有检测到已授权的 Android 设备'
  };
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

ipcMain.handle('dialog:import-config', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'JSON Config', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }

  try {
    const filePath = result.filePaths[0];
    const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { ok: true, filePath, config };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('dialog:export-config', async (_event, config) => {
  const result = await dialog.showSaveDialog({
    defaultPath: 'android-appium-runner-config.json',
    filters: [
      { name: 'JSON Config', extensions: ['json'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('automation:get-default-config', async () => {
  return DEFAULT_CONFIG;
});

ipcMain.handle('system:check', async () => {
  const [adbVersion, adbDevices, appiumVersion, javaVersion] = await Promise.all([
    runTool('adb', ['version']),
    runTool('adb', ['devices']),
    runTool('appium', ['-v']),
    runTool('java', ['-version'])
  ]);

  return [
    simplifyCheck('ADB', adbVersion),
    simplifyDeviceCheck(adbDevices),
    simplifyCheck('Appium', appiumVersion),
    simplifyCheck('Java', javaVersion)
  ];
});

ipcMain.handle('system:get-current-activity', async () => {
  const windowFocus = await runTool('adb', ['shell', 'dumpsys', 'window'], 20000);
  const activityFocus = await runTool('adb', ['shell', 'dumpsys', 'activity', 'activities'], 20000);
  const output = `${windowFocus.output}\n${activityFocus.output}`;
  const lines = output
    .split(/\r?\n/)
    .filter((line) => /mCurrentFocus|mFocusedApp|mResumedActivity|topResumedActivity/i.test(line))
    .map((line) => line.trim());

  return {
    ok: windowFocus.ok || activityFocus.ok,
    details: lines.length > 0 ? lines.join('\n') : output.trim() || windowFocus.error || activityFocus.error
  };
});

ipcMain.handle('system:open-artifacts', async () => {
  const artifactDir = getArtifactDir();
  fs.mkdirSync(artifactDir, { recursive: true });
  const error = await shell.openPath(artifactDir);
  return {
    ok: !error,
    path: artifactDir,
    error
  };
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
      artifactDir: getArtifactDir(),
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
