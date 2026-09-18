// The parts of the window that only exist in the desktop app: the Steam client
// switch, launch at startup, updates, and quit. Everything else comes from popup.js.
const steamIntegrationEl = document.getElementById('steamIntegration');
const steamStatusEl = document.getElementById('steamStatus');
const restartSteamBtn = document.getElementById('restartSteamBtn');
const launchAtStartupEl = document.getElementById('launchAtStartup');
const autoUpdateEl = document.getElementById('autoUpdate');
const updateStatusEl = document.getElementById('updateStatus');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const installUpdateBtn = document.getElementById('installUpdateBtn');
const quitBtn = document.getElementById('quitBtn');

function renderDesktop(desktop) {
  steamIntegrationEl.checked = desktop.steamIntegration;
  steamIntegrationEl.disabled = desktop.steam.state === 'not-found';
  steamStatusEl.textContent = desktop.steam.text;
  restartSteamBtn.hidden = desktop.steam.state !== 'needs-restart';
  launchAtStartupEl.checked = desktop.launchAtStartup;

  autoUpdateEl.checked = desktop.autoUpdate;
  updateStatusEl.textContent = `Version ${desktop.version}. ${desktop.update.text}`;
  const busy = ['checking', 'downloading'].includes(desktop.update.state);
  checkUpdateBtn.hidden = desktop.update.state === 'ready';
  checkUpdateBtn.disabled = busy || desktop.update.state === 'disabled';
  installUpdateBtn.hidden = desktop.update.state !== 'ready';
}

steamIntegrationEl.addEventListener('change', () => window.steamfx.setSteamIntegration(steamIntegrationEl.checked));
launchAtStartupEl.addEventListener('change', () => window.steamfx.setLaunchAtStartup(launchAtStartupEl.checked));
autoUpdateEl.addEventListener('change', () => window.steamfx.setAutoUpdate(autoUpdateEl.checked));
checkUpdateBtn.addEventListener('click', () => window.steamfx.checkForUpdates());
installUpdateBtn.addEventListener('click', () => window.steamfx.installUpdate());
restartSteamBtn.addEventListener('click', () => window.steamfx.restartSteam());
quitBtn.addEventListener('click', () => window.steamfx.quit());

window.steamfx.onDesktopChanged(renderDesktop);
window.steamfx.getDesktop().then(renderDesktop);

// The tray menu can flip settings too; refreshView() comes from popup.js.
window.steamfx.onSettingsChanged(() => refreshView());

// Keep the window exactly as tall as its content.
let lastHeight = 0;
new ResizeObserver(() => {
  const height = Math.ceil(document.body.getBoundingClientRect().height);
  if (height !== lastHeight) {
    lastHeight = height;
    window.steamfx.resize(height);
  }
}).observe(document.body);
