const fs = require('fs');
const path = require('path');
const { remote } = require('webdriverio');
const DEFAULT_CONFIG = require('../config/default-config.json');

const ARTIFACT_DIR = path.resolve(__dirname, '..', 'artifacts');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

function createLogger(log) {
  return (message) => {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (typeof log === 'function') {
      log(line);
      return;
    }
    console.log(line);
  };
}

async function saveScreenshot(driver, name, logLine) {
  ensureDir(ARTIFACT_DIR);
  const filePath = path.join(ARTIFACT_DIR, `${timestamp()}-${name}.png`);
  await driver.saveScreenshot(filePath);
  logLine(`截图已保存: ${filePath}`);
}

async function waitForDisplayed(driver, selector, timeout = 20000) {
  const el = await driver.$(selector);
  await el.waitForDisplayed({ timeout });
  return el;
}

async function clickWhenReady(driver, selector, timeout = 20000) {
  const el = await waitForDisplayed(driver, selector, timeout);
  await el.click();
}

async function typeWhenReady(driver, selector, value, timeout = 20000, clearFirst = false) {
  const el = await waitForDisplayed(driver, selector, timeout);
  if (clearFirst) {
    await el.clearValue();
  }
  await el.setValue(value);
}

async function dismissCommonPopups(driver, logLine) {
  const candidates = [
    'android=new UiSelector().textContains("允许")',
    'android=new UiSelector().textContains("始终允许")',
    'android=new UiSelector().textContains("仅在使用中允许")',
    'android=new UiSelector().textContains("同意")',
    'android=new UiSelector().textContains("我知道了")',
    'android=new UiSelector().textContains("跳过")',
    'android=new UiSelector().textContains("下次再说")'
  ];

  for (const selector of candidates) {
    const el = await driver.$(selector);
    if (await el.isExisting()) {
      logLine(`处理弹窗: ${selector}`);
      await el.click();
      await driver.pause(1000);
    }
  }
}

function normalizeConfig(userConfig = {}) {
  const merged = {
    ...DEFAULT_CONFIG,
    ...userConfig
  };

  merged.actions = Array.isArray(userConfig.actions) && userConfig.actions.length > 0
    ? userConfig.actions
    : DEFAULT_CONFIG.actions;

  return merged;
}

function validateConfig(config) {
  if (!config.apkPath || !config.apkPath.trim()) {
    throw new Error('缺少 APK 路径');
  }
  if (!config.appPackage || !config.appPackage.trim()) {
    throw new Error('缺少 appPackage');
  }
  if (!config.appActivity || !config.appActivity.trim()) {
    throw new Error('缺少 appActivity');
  }
}

async function runAction(driver, action, logLine) {
  const timeout = Number(action.timeoutMs) || 20000;

  switch (action.type) {
    case 'wait':
      logLine(`等待 ${action.ms || 1000}ms`);
      await driver.pause(Number(action.ms) || 1000);
      return;
    case 'click':
      if (!action.selector) {
        throw new Error('click 动作缺少 selector');
      }
      logLine(`点击: ${action.selector}`);
      await clickWhenReady(driver, action.selector, timeout);
      return;
    case 'input':
      if (!action.selector) {
        throw new Error('input 动作缺少 selector');
      }
      logLine(`输入: ${action.selector}`);
      await typeWhenReady(
        driver,
        action.selector,
        String(action.value ?? ''),
        timeout,
        Boolean(action.clearFirst)
      );
      return;
    case 'screenshot':
      await saveScreenshot(driver, action.name || 'step', logLine);
      return;
    case 'back':
      logLine('执行返回');
      await driver.back();
      return;
    case 'dismissPopups':
      await dismissCommonPopups(driver, logLine);
      return;
    default:
      throw new Error(`不支持的动作类型: ${action.type}`);
  }
}

async function runAndroidAutomation(userConfig = {}, hooks = {}) {
  ensureDir(ARTIFACT_DIR);

  const config = normalizeConfig(userConfig);
  validateConfig(config);

  const logLine = createLogger(hooks.log);
  let driver;

  logLine('开始连接 Appium');

  try {
    driver = await remote({
      hostname: config.appiumHost,
      port: Number(config.appiumPort),
      path: config.appiumPath || '/',
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': config.deviceName,
        'appium:app': config.apkPath,
        'appium:appPackage': config.appPackage,
        'appium:appActivity': config.appActivity,
        'appium:noReset': Boolean(config.noReset),
        'appium:newCommandTimeout': 180,
        'appium:autoGrantPermissions': Boolean(config.autoGrantPermissions)
      }
    });

    logLine('App 已启动');

    if (Number(config.postLaunchWaitMs) > 0) {
      logLine(`启动后等待 ${config.postLaunchWaitMs}ms`);
      await driver.pause(Number(config.postLaunchWaitMs));
    }

    for (const action of config.actions) {
      await runAction(driver, action, logLine);
    }

    if (Number(config.finalWaitMs) > 0) {
      logLine(`结束前等待 ${config.finalWaitMs}ms`);
      await driver.pause(Number(config.finalWaitMs));
    }

    await saveScreenshot(driver, config.screenshotLabel || 'after-run', logLine);
    logLine('自动化执行完成');
  } catch (error) {
    logLine(`自动化执行失败: ${error.message}`);
    if (driver) {
      try {
        await saveScreenshot(driver, 'error', logLine);
      } catch (screenshotError) {
        logLine(`错误截图保存失败: ${screenshotError.message}`);
      }
    }
    throw error;
  } finally {
    if (driver) {
      await driver.deleteSession();
      logLine('Appium 会话已关闭');
    }
  }
}

module.exports = {
  DEFAULT_CONFIG,
  runAndroidAutomation
};
