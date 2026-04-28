const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const ignoreDirs = new Set(['.git', 'artifacts', 'node_modules', 'release', 'dist', 'out']);
const requiredFiles = [
  'package.json',
  'README.md',
  'config/default-config.json',
  'docs/ACTIONS.md',
  'docs/BUILD.md',
  'docs/RESPONSIBLE_USE.md',
  'docs/SETUP.md',
  'docs/TROUBLESHOOTING.md',
  'desktop/index.html',
  'desktop/main.js',
  'desktop/preload.js',
  'desktop/renderer.js',
  'src/automation.js',
  'src/run-android-app.js',
  '.github/workflows/build-windows-exe.yml'
];

function relative(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, files);
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function checkRequiredFiles() {
  const missing = requiredFiles.filter((filePath) => {
    return !fs.existsSync(path.join(rootDir, filePath));
  });

  if (missing.length > 0) {
    throw new Error(`Missing required files: ${missing.join(', ')}`);
  }
}

function checkJson(filePath) {
  JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function checkJavaScript(filePath) {
  const result = spawnSync(process.execPath, ['--check', filePath], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${relative(filePath)} failed syntax check:\n${result.stderr || result.stdout}`);
  }
}

function checkDefaultConfig() {
  const configPath = path.join(rootDir, 'config/default-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  for (const key of ['apkPath', 'appPackage', 'appActivity']) {
    if (!config[key] || typeof config[key] !== 'string') {
      throw new Error(`config/default-config.json is missing string field: ${key}`);
    }
  }

  if (!Array.isArray(config.actions)) {
    throw new Error('config/default-config.json actions must be an array');
  }
}

function main() {
  checkRequiredFiles();

  for (const filePath of walk(rootDir)) {
    if (filePath.endsWith('.json')) {
      checkJson(filePath);
    }

    if (filePath.endsWith('.js')) {
      checkJavaScript(filePath);
    }
  }

  checkDefaultConfig();
  console.log('Project check passed');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
