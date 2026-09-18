const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel, cb) => ipcRenderer.on(channel, (_event, payload) => cb(payload));

contextBridge.exposeInMainWorld('steamfx', {
  getSettings: () => invoke('settings:get'),
  setSettings: (patch) => invoke('settings:set', patch),
  resetSettings: () => invoke('settings:reset'),
  onSettingsChanged: (cb) => on('settings:changed', cb),

  getRates: () => invoke('rates:get'),
  refreshRates: () => invoke('rates:refresh'),
  onRatesChanged: (cb) => on('rates:changed', cb),

  getDesktop: () => invoke('desktop:get'),
  setLaunchAtStartup: (value) => invoke('desktop:launch-at-startup', value),
  setSteamIntegration: (value) => invoke('desktop:steam-integration', value),
  restartSteam: () => invoke('desktop:restart-steam'),
  setAutoUpdate: (value) => invoke('desktop:auto-update', value),
  checkForUpdates: () => invoke('updates:check'),
  installUpdate: () => invoke('updates:install'),
  onDesktopChanged: (cb) => on('desktop:changed', cb),

  resize: (height) => invoke('window:resize', height),
  quit: () => invoke('app:quit')
});
