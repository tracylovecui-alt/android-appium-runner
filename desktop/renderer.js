const STORAGE_KEY = 'android-appium-runner-config';

const form = document.querySelector('#config-form');
const pickApkButton = document.querySelector('#pick-apk');
const useExampleButton = document.querySelector('#use-example');
const addActionButton = document.querySelector('#add-action');
const addBasicFlowButton = document.querySelector('#add-basic-flow');
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
const actionBuilder = document.querySelector('#action-builder');
const actionsTextArea = document.querySelector('#actions');

let defaultConfigCache = null;
let isSyncingActions = false;

const ACTION_TYPES = [
  { value: 'dismissPopups', label: '处理弹窗' },
  { value: 'click', label: '点击' },
  { value: 'input', label: '输入' },
  { value: 'wait', label: '等待' },
  { value: 'screenshot', label: '截图' },
  { value: 'back', label: '返回' }
];

const BASIC_FLOW = [
  { type: 'dismissPopups' },
  { type: 'wait', ms: 3000 },
  { type: 'screenshot', name: 'home' }
];

function appendLog(message) {
  logOutput.textContent += `${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setRunningState(running) {
  runButton.disabled = running;
  runButton.textContent = running ? '执行中...' : '开始执行';
}

function parseActions() {
  syncActionsFromBuilder();
  const actions = JSON.parse(actionsTextArea.value);
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
  renderActionBuilder(config.actions || []);
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

function createAction(type = 'click') {
  switch (type) {
    case 'dismissPopups':
      return { type: 'dismissPopups' };
    case 'input':
      return { type: 'input', selector: '', value: '', clearFirst: true };
    case 'wait':
      return { type: 'wait', ms: 2000 };
    case 'screenshot':
      return { type: 'screenshot', name: 'step' };
    case 'back':
      return { type: 'back' };
    case 'click':
    default:
      return { type: 'click', selector: '' };
  }
}

function normalizeActionForType(type, previous = {}) {
  const action = createAction(type);

  if ('selector' in action && previous.selector) {
    action.selector = previous.selector;
  }
  if ('value' in action && previous.value) {
    action.value = previous.value;
  }
  if ('name' in action && previous.name) {
    action.name = previous.name;
  }
  if ('ms' in action && previous.ms) {
    action.ms = previous.ms;
  }
  if ('clearFirst' in action && typeof previous.clearFirst === 'boolean') {
    action.clearFirst = previous.clearFirst;
  }

  return action;
}

function actionTypeLabel(type) {
  const item = ACTION_TYPES.find((option) => option.value === type);
  return item ? item.label : type;
}

function fieldValue(action, key, fallback = '') {
  return action[key] === undefined || action[key] === null ? fallback : String(action[key]);
}

function renderActionFields(action) {
  switch (action.type) {
    case 'click':
      return `
        <label>
          <span>选择器</span>
          <input data-action-field="selector" type="text" value="${escapeAttr(fieldValue(action, 'selector'))}" placeholder="id=com.example.app:id/button" />
        </label>
      `;
    case 'input':
      return `
        <label>
          <span>选择器</span>
          <input data-action-field="selector" type="text" value="${escapeAttr(fieldValue(action, 'selector'))}" placeholder="id=com.example.app:id/input" />
        </label>
        <label>
          <span>输入内容</span>
          <input data-action-field="value" type="text" value="${escapeAttr(fieldValue(action, 'value'))}" placeholder="要输入的文字" />
        </label>
        <label class="inline-check">
          <input data-action-field="clearFirst" type="checkbox" ${action.clearFirst ? 'checked' : ''} />
          <span>输入前清空</span>
        </label>
      `;
    case 'wait':
      return `
        <label>
          <span>等待毫秒</span>
          <input data-action-field="ms" type="number" value="${escapeAttr(fieldValue(action, 'ms', 2000))}" />
        </label>
      `;
    case 'screenshot':
      return `
        <label>
          <span>截图名称</span>
          <input data-action-field="name" type="text" value="${escapeAttr(fieldValue(action, 'name', 'step'))}" />
        </label>
      `;
    case 'dismissPopups':
    case 'back':
    default:
      return '<div class="action-note">这个动作不需要额外填写</div>';
  }
}

function escapeAttr(value) {
  return String(value).replace(/[<>&"]/g, (char) => {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char];
  });
}

function renderActionBuilder(actions) {
  isSyncingActions = true;
  actionsTextArea.value = JSON.stringify(actions, null, 2);
  actionBuilder.innerHTML = '';

  if (!actions.length) {
    actionBuilder.innerHTML = '<div class="empty-state">还没有动作，点“添加动作”开始</div>';
    isSyncingActions = false;
    return;
  }

  actions.forEach((action, index) => {
    const row = document.createElement('div');
    row.className = 'action-row';
    row.dataset.index = String(index);
    row.dataset.actionType = action.type;
    row.innerHTML = `
      <div class="action-row-head">
        <strong>${index + 1}. ${actionTypeLabel(action.type)}</strong>
        <div class="button-group">
          <button type="button" class="secondary compact" data-action-command="up">上移</button>
          <button type="button" class="secondary compact" data-action-command="down">下移</button>
          <button type="button" class="secondary compact danger" data-action-command="remove">删除</button>
        </div>
      </div>
      <div class="action-grid">
        <label>
          <span>动作类型</span>
          <select data-action-field="type">
            ${ACTION_TYPES.map((option) => `
              <option value="${option.value}" ${option.value === action.type ? 'selected' : ''}>${option.label}</option>
            `).join('')}
          </select>
        </label>
        ${renderActionFields(action)}
      </div>
    `;
    actionBuilder.appendChild(row);
  });

  isSyncingActions = false;
}

function readActionRow(row) {
  const originalType = row.dataset.actionType;
  const type = row.querySelector('[data-action-field="type"]').value;
  const action = type === originalType
    ? createAction(type)
    : normalizeActionForType(type, readVisibleFields(row));

  for (const input of row.querySelectorAll('[data-action-field]')) {
    const field = input.dataset.actionField;
    if (field === 'type') {
      continue;
    }

    if (input.type === 'checkbox') {
      action[field] = input.checked;
      continue;
    }

    if (field === 'ms' || field === 'timeoutMs') {
      action[field] = Number(input.value) || 0;
      continue;
    }

    action[field] = input.value;
  }

  return action;
}

function readVisibleFields(row) {
  const values = {};
  for (const input of row.querySelectorAll('[data-action-field]')) {
    const field = input.dataset.actionField;
    if (field === 'type') {
      continue;
    }

    if (input.type === 'checkbox') {
      values[field] = input.checked;
      continue;
    }

    if (field === 'ms' || field === 'timeoutMs') {
      values[field] = Number(input.value) || 0;
      continue;
    }

    values[field] = input.value;
  }

  return values;
}

function readActionsFromBuilder() {
  return Array.from(actionBuilder.querySelectorAll('.action-row')).map(readActionRow);
}

function syncActionsFromBuilder() {
  if (isSyncingActions) {
    return;
  }

  const actions = readActionsFromBuilder();
  actionsTextArea.value = JSON.stringify(actions, null, 2);
}

function syncBuilderFromJson() {
  try {
    const actions = JSON.parse(actionsTextArea.value || '[]');
    if (Array.isArray(actions)) {
      renderActionBuilder(actions);
    }
  } catch {
    // Keep the builder untouched until the JSON is valid again.
  }
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
  renderActionBuilder(defaults.actions);
});

addActionButton.addEventListener('click', () => {
  const actions = readActionsFromBuilder();
  actions.push(createAction('click'));
  renderActionBuilder(actions);
});

addBasicFlowButton.addEventListener('click', () => {
  renderActionBuilder(BASIC_FLOW);
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

actionBuilder.addEventListener('input', (event) => {
  const field = event.target.dataset.actionField;
  if (field === 'type') {
    const actions = readActionsFromBuilder();
    renderActionBuilder(actions);
    return;
  }

  syncActionsFromBuilder();
});

actionBuilder.addEventListener('change', (event) => {
  const field = event.target.dataset.actionField;
  if (field === 'type') {
    const actions = readActionsFromBuilder();
    renderActionBuilder(actions);
    return;
  }

  syncActionsFromBuilder();
});

actionBuilder.addEventListener('click', (event) => {
  const command = event.target.dataset.actionCommand;
  if (!command) {
    return;
  }

  const row = event.target.closest('.action-row');
  const index = Number(row.dataset.index);
  const actions = readActionsFromBuilder();

  if (command === 'remove') {
    actions.splice(index, 1);
  }

  if (command === 'up' && index > 0) {
    [actions[index - 1], actions[index]] = [actions[index], actions[index - 1]];
  }

  if (command === 'down' && index < actions.length - 1) {
    [actions[index + 1], actions[index]] = [actions[index], actions[index + 1]];
  }

  renderActionBuilder(actions);
});

actionsTextArea.addEventListener('input', syncBuilderFromJson);

window.appBridge.onLog((line) => {
  appendLog(line);
});

window.appBridge.onState((payload) => {
  setRunningState(Boolean(payload.running));
});

init().catch((error) => {
  appendLog(`初始化失败: ${error.message}`);
});
