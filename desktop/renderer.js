const STORAGE_KEY = 'android-appium-runner-config';

const form = document.querySelector('#config-form');
const pickApkButton = document.querySelector('#pick-apk');
const useExampleButton = document.querySelector('#use-example');
const saveConfigButton = document.querySelector('#save-config');
const clearLogButton = document.querySelector('#clear-log');
const runButton = document.querySelector('#run-button');
const logOutput = document.querySelector('#log-output');

function appendLog(message) {
  logOutput.textContent += `${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setRunningState(running) {
  runButton.disabled = running;
  runButton.textContent = running ? '执行中...' : '开始执行';
}

function collectConfig() {
  return {
    apkPath: document.querySelector('#apkPath').value.trim(),
    appPackage: document.querySelector('#appPackage').value.trim(),
    appActivity: document.querySelector('#appActivity').value.trim(),
    appiumHost: document.querySelector('#appiumHost').value.trim(),
    appiumPort: Number(document.querySelector('#appiumPort').value),
    deviceName: document.querySelector('#deviceName').value.trim(),
    postLaunchWaitMs: Number(document.querySelector('#postLaunchWaitMs').value),
    finalWaitMs: Number(document.querySelector('#finalWaitMs').value),
    screenshotLabel: document.querySelector('#screenshotLabel').value.trim(),
    noReset: document.querySelector('#noReset').checked,
    autoGrantPermissions: document.querySelector('#autoGrantPermissions').checked,
    actions: JSON.parse(document.querySelector('#actions').value)
  };
}

function populateForm(config) {
  document.querySelector('#apkPath').value = config.apkPath || '';
  document.querySelector('#appPackage').value = config.appPackage || '';
  document.querySelector('#appActivity').value = config.appActivity || '';
  document.querySelector('#appiumHost').value = config.appiumHost || '127.0.0.1';
  document.querySelector('#appiumPort').value = config.appiumPort || 4723;
  document.querySelector('#deviceName').value = config.deviceName || 'Android Device';
  document.querySelector('#postLaunchWaitMs').value = config.postLaunchWaitMs || 5000;
  document.querySelector('#finalWaitMs').value = config.finalWaitMs || 3000;
  document.querySelector('#screenshotLabel').value = config.screenshotLabel || 'after-run';
  document.querySelector('#noReset').checked = Boolean(config.noReset);
  document.querySelector('#autoGrantPermissions').checked = Boolean(config.autoGrantPermissions);
  document.querySelector('#actions').value = JSON.stringify(config.actions || [], null, 2);
}

function saveConfigToLocal() {
  const config = collectConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  appendLog('本地配置已保存');
}

async function init() {
  const defaults = await window.appBridge.getDefaultConfig();
  const savedConfig = localStorage.getItem(STORAGE_KEY);

  if (savedConfig) {
    try {
      populateForm(JSON.parse(savedConfig));
      appendLog('已加载上次保存的本地配置');
      return;
    } catch (error) {
      appendLog(`读取本地配置失败，已回退默认配置: ${error.message}`);
    }
  }

  populateForm(defaults);
}

pickApkButton.addEventListener('click', async () => {
  const filePath = await window.appBridge.pickApk();
  if (filePath) {
    document.querySelector('#apkPath').value = filePath;
  }
});

useExampleButton.addEventListener('click', async () => {
  const defaults = await window.appBridge.getDefaultConfig();
  document.querySelector('#actions').value = JSON.stringify(defaults.actions, null, 2);
});

saveConfigButton.addEventListener('click', () => {
  try {
    saveConfigToLocal();
  } catch (error) {
    appendLog(`保存配置失败: ${error.message}`);
  }
});

clearLogButton.addEventListener('click', () => {
  logOutput.textContent = '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  let config;
  try {
    config = collectConfig();
  } catch (error) {
    appendLog(`配置格式错误: ${error.message}`);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  appendLog('开始提交自动化任务');

  const result = await window.appBridge.runAutomation(config);
  if (result.ok) {
    appendLog('任务执行完成');
    return;
  }

  appendLog(`任务执行失败: ${result.error}`);
});

window.appBridge.onLog((line) => {
  appendLog(line);
});

window.appBridge.onState((payload) => {
  setRunningState(Boolean(payload.running));
});

init().catch((error) => {
  appendLog(`初始化失败: ${error.message}`);
});
