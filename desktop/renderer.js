const STORAGE_KEY = 'android-appium-runner-config';

const form = document.querySelector('#config-form');
const pickApkButton = document.querySelector('#pick-apk');
const useExampleButton = document.querySelector('#use-example');
const saveConfigButton = document.querySelector('#save-config');
const clearLogButton = document.querySelector('#clear-log');
const copyLogButton = document.querySelector('#copy-log');
const runButton = document.querySelector('#run-button');
const logOutput = document.querySelector('#log-output');
const checkSystemButton = document.querySelector('#check-system');
const detectActivityButton = document.querySelector('#detect-activity');
const importConfigButton = document.querySelector('#import-config');
const exportConfigButton = document.querySelector('#export-config');
const resetConfigButton = document.querySelector('#reset-config');
const openArtifactsButton = document.querySelector('#open-artifacts');
const statusList = document.querySelector('#status-list');

let defaultConfigCache = null;

function appendLog(message) {
  logOutput.textContent += `${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setRunningState(running) {
  runButton.disabled = running;
  runButton.textContent = running ? '执行中...' : '开始执行';
}

function parseActions() {
  const actions = JSON.parse(document.querySelector('#actions').value);
  if (!Array.isArray(actions)) {
    throw new Error('动作脚本必须是 JSON 数组');
  }

  return actions;
}

function collectConfig() {
  return {
    apkPath: document.querySelector('#apkPath').value.trim(),
    appPackage: document.querySelector('#appPackage').value.trim(),
    appActivity: document.querySelector('#appActivity').value.trim(),
    appiumHost: document.querySelector('#appiumHost').value.trim(),
    appiumPort: Number(document.querySelector('#appiumPort').value),
    appiumPath: document.querySelector('#appiumPath').value.trim() || '/',
    deviceName: document.querySelector('#deviceName').value.trim(),
    postLaunchWaitMs: Number(document.querySelector('#postLaunchWaitMs').value),
    finalWaitMs: Number(document.querySelector('#finalWaitMs').value),
    screenshotLabel: document.querySelector('#screenshotLabel').value.trim(),
    noReset: document.querySelector('#noReset').checked,
    autoGrantPermissions: document.querySelector('#autoGrantPermissions').checked,
    actions: parseActions()
  };
}

function populateForm(config) {
  document.querySelector('#apkPath').value = config.apkPath || '';
  document.querySelector('#appPackage').value = config.appPackage || '';
  document.querySelector('#appActivity').value = config.appActivity || '';
  document.querySelector('#appiumHost').value = config.appiumHost || '127.0.0.1';
  document.querySelector('#appiumPort').value = config.appiumPort || 4723;
  document.querySelector('#appiumPath').value = config.appiumPath || '/';
  document.querySelector('#deviceName').value = config.deviceName || 'Android Device';
  document.querySelector('#postLaunchWaitMs').value = config.postLaunchWaitMs || 5000;
  document.querySelector('#finalWaitMs').value = config.finalWaitMs || 3000;
  document.querySelector('#screenshotLabel').value = config.screenshotLabel || 'after-run';
  document.querySelector('#noReset').checked = Boolean(config.noReset);
  document.querySelector('#autoGrantPermissions').checked = Boolean(config.autoGrantPermissions);
  document.querySelector('#actions').value = JSON.stringify(config.actions || [], null, 2);
}

function renderStatus(checks) {
  if (!Array.isArray(checks) || checks.length === 0) {
    statusList.innerHTML = '<div class="empty-state">还没有检查环境</div>';
    return;
  }

  statusList.innerHTML = checks.map((check) => {
    const stateClass = check.ok ? 'ok' : 'fail';
    const stateText = check.ok ? '正常' : '异常';
    const details = String(check.details || '').replace(/[<>&]/g, (char) => {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char];
    });

    return `
      <div class="status-item ${stateClass}">
        <div class="status-top">
          <strong>${check.label}</strong>
          <span>${stateText}</span>
        </div>
        <code>${details || check.command}</code>
      </div>
    `;
  }).join('');
}

function parsePackageActivity(details) {
  const match = String(details).match(/([a-zA-Z][\w]*(?:\.[\w]+)+)\/([^\s}]+)/);
  if (!match) {
    return null;
  }

  return {
    appPackage: match[1],
    appActivity: match[2]
  };
}

function saveConfigToLocal() {
  const config = collectConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  appendLog('本地配置已保存');
}

async function init() {
  const defaults = await window.appBridge.getDefaultConfig();
  defaultConfigCache = defaults;
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

checkSystemButton.addEventListener('click', async () => {
  appendLog('开始检查本机环境');
  renderStatus([]);

  const checks = await window.appBridge.checkSystem();
  renderStatus(checks);

  const failed = checks.filter((check) => !check.ok);
  if (failed.length === 0) {
    appendLog('环境检查通过');
    return;
  }

  appendLog(`环境检查发现 ${failed.length} 项异常`);
});

detectActivityButton.addEventListener('click', async () => {
  appendLog('正在读取当前前台 Activity');
  const result = await window.appBridge.getCurrentActivity();

  if (!result.ok) {
    appendLog(`读取 Activity 失败: ${result.details}`);
    return;
  }

  appendLog(`当前 Activity 信息:\n${result.details}`);

  const parsed = parsePackageActivity(result.details);
  if (parsed) {
    document.querySelector('#appPackage').value = parsed.appPackage;
    document.querySelector('#appActivity').value = parsed.appActivity;
    appendLog(`已自动填入: ${parsed.appPackage} / ${parsed.appActivity}`);
  }
});

importConfigButton.addEventListener('click', async () => {
  const result = await window.appBridge.importConfig();
  if (result.canceled) {
    return;
  }

  if (!result.ok) {
    appendLog(`导入配置失败: ${result.error}`);
    return;
  }

  populateForm(result.config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result.config));
  appendLog(`已导入配置: ${result.filePath}`);
});

exportConfigButton.addEventListener('click', async () => {
  let config;
  try {
    config = collectConfig();
  } catch (error) {
    appendLog(`配置格式错误，无法导出: ${error.message}`);
    return;
  }

  const result = await window.appBridge.exportConfig(config);
  if (result.canceled) {
    return;
  }

  if (!result.ok) {
    appendLog(`导出配置失败: ${result.error}`);
    return;
  }

  appendLog(`已导出配置: ${result.filePath}`);
});

resetConfigButton.addEventListener('click', async () => {
  const defaults = defaultConfigCache || await window.appBridge.getDefaultConfig();
  populateForm(defaults);
  localStorage.removeItem(STORAGE_KEY);
  appendLog('已恢复默认配置');
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

copyLogButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(logOutput.textContent);
    appendLog('日志已复制');
  } catch (error) {
    appendLog(`复制日志失败: ${error.message}`);
  }
});

openArtifactsButton.addEventListener('click', async () => {
  const result = await window.appBridge.openArtifacts();
  if (result.ok) {
    appendLog(`已打开截图目录: ${result.path}`);
    return;
  }

  appendLog(`打开截图目录失败: ${result.error}`);
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
