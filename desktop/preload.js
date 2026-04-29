const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appBridge', {
  getDefaultConfig: () => ipcRenderer.invoke('automation:get-default-config'),
  pickApk: () => ipcRenderer.invoke('dialog:pick-apk'),
  importConfig: () => ipcRenderer.invoke('dialog:import-config'),
  exportConfig: (config) => ipcRenderer.invoke('dialog:export-config', config),
  checkSystem: () => ipcRenderer.invoke('system:check'),
  getCurrentActivity: () => ipcRenderer.invoke('system:get-current-activity'),
  openArtifacts: () => ipcRenderer.invoke('system:open-artifacts'),
  runAutomation: (config) => ipcRenderer.invoke('automation:run', config),
  onLog: (callback) => ipcRenderer.on('automation:log', (_event, line) => callback(line)),
  onState: (callback) => ipcRenderer.on('automation:state', (_event, payload) => callback(payload))
});
