const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, screen, Notification, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// Everything the app writes (settings, rates, log, Chromium's own caches) goes
// under one folder so the uninstaller can remove it in one go.
const dataDir = process.env.STEAMFX_DATA_DIR || path.join(app.getPath('appData'), 'SteamFX');
app.setPath('userData', dataDir);
app.setAppUserModelId('com.pozii.steamfx');

const { init: initLog, log } = require('./log');
const { createStore, loadDefaultSettings } = require('./store');
const { fetchRates, REFRESH_MS } = require('./rates');
const { Injector } = require('./injector');
const { buildInjection } = require('./injection');
const steam = require('./steam');
const autostart = require('./autostart');
const { createUpdater } = require('./updater');

const WINDOW_WIDTH = 320;
const STARTED_HIDDEN = process.argv.includes('--hidden');
// A custom data folder means a dev or test run. Those must never touch the real
// "launch at startup" registry entry of an installed copy.
const SANDBOXED = Boolean(process.env.STEAMFX_DATA_DIR);
// The installer reads this file on uninstall to find the Steam flag file we
// created (see build/installer.nsh). It only exists while we own the flag.
const MARKER_FILE = path.join(dataDir, 'steam-flag.txt');
const resDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'build');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let store;
let injector;
let updater;
let tray;
let win;
let steamDir = null;
let steamRunning = false;
let integrationError = null;
let notifiedRestart = false;
let quitting = false;

const defaults = () => loadDefaultSettings();

// ---------------------------------------------------------------- state ----

function injectionState({ disabled = false } = {}) {
  const rates = store.getRates();
  return { ...store.getSettings(), ...(disabled ? { enabled: false } : {}), rates: rates ? rates.rates : null };
}

function steamStatus() {
  const desktop = store.getDesktop();
  if (!steamDir) {
    return { state: 'not-found', short: 'not found', text: "Steam wasn't found on this PC." };
  }
  if (!desktop.steamIntegration) {
    return {
      state: 'off',
      short: 'off',
      text: 'Turn this on to convert prices inside the Steam app. Steam needs one restart afterwards.'
    };
  }
  if (integrationError) {
    return { state: 'error', short: 'error', text: `Couldn't turn this on: ${integrationError}` };
  }
  if (injector.status.reachable) {
    return { state: 'connected', short: 'connected', text: 'Connected. Prices in the store are being converted.' };
  }
  if (steamRunning) {
    return {
      state: 'needs-restart',
      short: 'restart needed',
      text: 'Almost there. Restart Steam once so it lets Steam FX in.'
    };
  }
  return { state: 'waiting', short: 'waiting for Steam', text: 'On. Waiting for Steam to start.' };
}

function desktopSnapshot() {
  const desktop = store.getDesktop();
  const update = updater.status();
  return {
    launchAtStartup: desktop.launchAtStartup,
    autoUpdate: desktop.autoUpdate,
    steamIntegration: desktop.steamIntegration,
    steam: steamStatus(),
    version: app.getVersion(),
    update: { state: update.state, text: update.text }
  };
}

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

function publishDesktop() {
  send('desktop:changed', desktopSnapshot());
  refreshTray();
}

// ------------------------------------------------------------- settings ----

const SETTING_VALIDATORS = {
  enabled: (v) => typeof v === 'boolean',
  replacePrice: (v) => typeof v === 'boolean',
  targetCurrency: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
  sourceCurrency: (v) => typeof v === 'string' && (v === 'auto' || /^[A-Z]{3}$/.test(v)),
  badgeColor: (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
};

async function updateSettings(patch) {
  const clean = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (SETTING_VALIDATORS[key] && SETTING_VALIDATORS[key](value)) clean[key] = value;
  }
  store.setSettings(clean);
  send('settings:changed', store.getSettings());
  refreshTray();
  if (store.getDesktop().steamIntegration) await injector.refresh();
}

async function refreshRates() {
  try {
    const rates = await fetchRates();
    store.setRates(rates);
    send('rates:changed', rates);
    if (store.getDesktop().steamIntegration) await injector.refresh();
    log('rates refreshed');
    return { ok: true };
  } catch (err) {
    log('rate refresh failed:', err.message);
    return { ok: false, error: err.message };
  }
}

// --------------------------------------------------------- steam client ----

function removeOwnedFlag() {
  if (!fs.existsSync(MARKER_FILE)) return;
  try {
    const flag = fs.readFileSync(MARKER_FILE, 'utf8').trim();
    if (flag) fs.rmSync(flag, { force: true });
    fs.rmSync(MARKER_FILE, { force: true });
  } catch (err) {
    log('could not remove Steam flag file:', err.message);
  }
}

function ensureFlag() {
  const { created } = steam.enableFlag(steamDir);
  if (created) fs.writeFileSync(MARKER_FILE, steam.flagPath(steamDir));
}

async function setSteamIntegration(on) {
  integrationError = null;

  if (on) {
    if (!steamDir) steamDir = await steam.findSteamDir();
    if (!steamDir) {
      publishDesktop();
      return;
    }
    try {
      ensureFlag();
    } catch (err) {
      integrationError = err.message;
      log('could not create Steam flag file:', err.message);
      store.setDesktop({ steamIntegration: false });
      publishDesktop();
      return;
    }
    store.setDesktop({ steamIntegration: true });
    injector.start();
    steamRunning = await steam.isSteamRunning();
    if (steamRunning && !injector.status.reachable) notifyRestartNeeded();
  } else {
    store.setDesktop({ steamIntegration: false });
    await injector.deactivate(buildInjection(injectionState({ disabled: true })));
    removeOwnedFlag();
  }

  publishDesktop();
}

function notifyRestartNeeded() {
  if (notifiedRestart || !Notification.isSupported()) return;
  notifiedRestart = true;
  new Notification({
    title: 'Steam FX',
    body: 'Restart Steam once so Steam FX can convert prices inside it.'
  }).show();
}

async function restartSteamFlow() {
  const options = {
    type: 'question',
    buttons: ['Restart Steam', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Restart Steam',
    message: 'Restart Steam now?',
    detail: 'Steam will close and open again. Running games will close and downloads will pause for a moment.'
  };
  const { response } =
    win && !win.isDestroyed() ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
  if (response !== 0) return;

  try {
    await steam.restartSteam(steamDir);
  } catch (err) {
    log('restart failed:', err.message);
    dialog.showErrorBox('Steam FX', `Couldn't restart Steam: ${err.message}`);
  }
}

// Cheap poll: is Steam running at all? Only matters while we're waiting for
// the debugging port to appear.
async function pollSteamRunning() {
  if (!store.getDesktop().steamIntegration || injector.status.reachable) return;
  const running = await steam.isSteamRunning();
  if (running !== steamRunning) {
    steamRunning = running;
    if (running) setTimeout(() => !injector.status.reachable && notifyRestartNeeded(), 8000);
    publishDesktop();
  }
}

// ---------------------------------------------------------------- window ----

function positionWindow() {
  if (!win || !tray) return;
  const [w, h] = win.getSize();
  const bounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const area = display.workArea;

  let x = bounds.width ? Math.round(bounds.x + bounds.width / 2 - w / 2) : area.x + area.width - w - 8;
  x = Math.max(area.x + 8, Math.min(x, area.x + area.width - w - 8));
  const belowCenter = bounds.width ? bounds.y > area.y + area.height / 2 : true;
  const y = belowCenter ? area.y + area.height - h - 8 : area.y + 8;
  win.setPosition(x, y);
}

function createWindow() {
  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: 420,
    useContentSize: true,
    show: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    title: 'Steam FX',
    icon: nativeImage.createFromPath(path.join(resDir, 'tray@2x.png')),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Closing the window just tucks it back into the tray.
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win.hide();
    }
  });
}

function showWindow() {
  if (!win) createWindow();
  positionWindow();
  win.show();
  win.focus();
}

// ------------------------------------------------------------------ tray ----

function refreshTray() {
  if (!tray) return;
  const settings = store.getSettings();
  const desktop = store.getDesktop();
  const status = steamStatus();

  tray.setToolTip(settings.enabled ? `Steam FX: converting to ${settings.targetCurrency}` : 'Steam FX: off');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Convert prices',
        type: 'checkbox',
        checked: settings.enabled,
        click: (item) => updateSettings({ enabled: item.checked })
      },
      { label: `Currency: ${settings.targetCurrency}…`, click: showWindow },
      { type: 'separator' },
      { label: `Steam app: ${status.short}`, enabled: false },
      ...(status.state === 'needs-restart' ? [{ label: 'Restart Steam…', click: restartSteamFlow }] : []),
      { type: 'separator' },
      { label: 'Refresh exchange rates', click: () => refreshRates() },
      updater.status().state === 'ready'
        ? { label: `Restart to update (v${updater.status().version})`, click: () => updater.install() }
        : { label: 'Check for updates', click: () => updater.check() },
      {
        label: 'Launch at startup',
        type: 'checkbox',
        checked: desktop.launchAtStartup,
        click: (item) => setLaunchAtStartup(item.checked)
      },
      { type: 'separator' },
      { label: 'Open Steam FX', click: showWindow },
      { label: 'Quit', click: () => app.quit() }
    ])
  );
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(resDir, 'tray.png')));
  tray.on('click', () => (win && win.isVisible() ? win.hide() : showWindow()));
  refreshTray();
}

// ------------------------------------------------------------- autostart ----

async function setLaunchAtStartup(enabled) {
  store.setDesktop({ launchAtStartup: enabled });
  // Only an installed build has a stable exe path worth registering.
  if (app.isPackaged && !SANDBOXED) await autostart.setEnabled(enabled, process.execPath);
  publishDesktop();
}

// --------------------------------------------------------------- updates ----

function setAutoUpdate(enabled) {
  store.setDesktop({ autoUpdate: enabled });
  updater.schedule(enabled);
  publishDesktop();
}

function notifyUpdateReady(version) {
  if (!Notification.isSupported()) return;
  new Notification({
    title: 'Steam FX',
    body: `Version ${version} is ready. It installs when you quit Steam FX, or restart it from the tray.`
  }).show();
}

// ------------------------------------------------------------------- ipc ----

function registerIpc() {
  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:set', (_e, patch) => updateSettings(patch));
  ipcMain.handle('settings:reset', async () => {
    store.resetSettings();
    send('settings:changed', store.getSettings());
    refreshTray();
    if (store.getDesktop().steamIntegration) await injector.refresh();
  });

  ipcMain.handle('rates:get', () => store.getRates());
  ipcMain.handle('rates:refresh', () => refreshRates());

  ipcMain.handle('desktop:get', () => desktopSnapshot());
  ipcMain.handle('desktop:launch-at-startup', (_e, value) => setLaunchAtStartup(Boolean(value)));
  ipcMain.handle('desktop:steam-integration', (_e, value) => setSteamIntegration(Boolean(value)));
  ipcMain.handle('desktop:restart-steam', () => restartSteamFlow());
  ipcMain.handle('desktop:auto-update', (_e, value) => setAutoUpdate(Boolean(value)));
  ipcMain.handle('updates:check', () => updater.check());
  ipcMain.handle('updates:install', () => updater.install());

  ipcMain.handle('window:resize', (_e, height) => {
    if (!win || win.isDestroyed()) return;
    const clamped = Math.max(160, Math.min(Math.ceil(Number(height)) || 420, 600));
    win.setContentSize(WINDOW_WIDTH, clamped);
    if (win.isVisible()) positionWindow();
  });
  ipcMain.handle('app:quit', () => app.quit());
}

// ------------------------------------------------------------------ boot ----

app.on('second-instance', () => showWindow());
app.on('before-quit', () => {
  quitting = true;
});
// A tray app keeps running with no windows open.
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  if (!gotLock) return;
  initLog(dataDir);
  log('starting', app.getVersion(), app.isPackaged ? 'packaged' : 'dev');

  store = createStore(path.join(dataDir, 'config.json'), defaults());
  injector = new Injector({
    getSource: () => buildInjection(injectionState()),
    port: Number(process.env.STEAMFX_CDP_PORT) || undefined,
    log
  });
  injector.on('status', publishDesktop);

  // STEAMFX_UPDATE_URL lets you test an update from a local folder of
  // release files instead of GitHub.
  const feedUrl = process.env.STEAMFX_UPDATE_URL || undefined;
  updater = createUpdater({
    autoUpdater: app.isPackaged || feedUrl ? require('electron-updater').autoUpdater : null,
    enabled: app.isPackaged || Boolean(feedUrl),
    feedUrl,
    log
  });
  let lastUpdateState = null;
  updater.on('status', (status) => {
    if (status.state === 'ready' && lastUpdateState !== 'ready') notifyUpdateReady(status.version);
    lastUpdateState = status.state;
    publishDesktop();
  });

  registerIpc();
  createTray();
  createWindow();

  steamDir = await steam.findSteamDir();
  log('steam dir:', steamDir || 'not found');

  const desktop = store.getDesktop();

  // Keep the Run entry pointing at this exe (e.g. after a reinstall).
  if (app.isPackaged && !SANDBOXED) await autostart.setEnabled(desktop.launchAtStartup, process.execPath);

  if (desktop.steamIntegration && steamDir) {
    try {
      ensureFlag();
    } catch (err) {
      log('could not restore Steam flag file:', err.message);
    }
    injector.start();
    steamRunning = await steam.isSteamRunning();
  }

  updater.schedule(desktop.autoUpdate);

  const rates = store.getRates();
  if (!rates || Date.now() - rates.fetchedAt > REFRESH_MS) refreshRates();
  setInterval(refreshRates, REFRESH_MS);
  setInterval(pollSteamRunning, 4000);

  publishDesktop();

  // First launch, or the user started it by hand: show the window. Autostart
  // passes --hidden so a login doesn't pop anything up.
  if (!STARTED_HIDDEN || !desktop.firstRunDone) showWindow();
  store.setDesktop({ firstRunDone: true });
});
