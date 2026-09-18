// Wraps electron-updater in a small state machine the window and tray can show.
//
// Updates come from the latest GitHub release (its installer plus latest.yml).
// They download in the background and install when the app quits, or when the
// user picks "Restart to update". The installer keeps your settings; only a
// real uninstall wipes them.
const { EventEmitter } = require('events');

const FIRST_CHECK_DELAY_MS = 30 * 1000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

const TEXTS = {
  disabled: 'Updates are checked in the installed app.',
  idle: 'Not checked yet.',
  checking: 'Checking for updates…',
  none: "You're up to date.",
  downloading: (s) => `Downloading v${s.version}${s.percent ? ` (${s.percent}%)` : '…'}`,
  ready: (s) => `v${s.version} is ready. It installs when you quit, or restart now.`,
  error: "Couldn't check for updates right now."
};

function describe(status) {
  const text = TEXTS[status.state];
  return typeof text === 'function' ? text(status) : text;
}

// `autoUpdater` is electron-updater's singleton, passed in so tests can fake it.
// `feedUrl` points at a folder holding latest.yml; it exists for testing an
// update without publishing a release.
function createUpdater({ autoUpdater, log = () => {}, enabled, feedUrl }) {
  const events = new EventEmitter();
  let status = { state: enabled ? 'idle' : 'disabled' };
  let timer = null;
  let firstCheck = null;

  const set = (next) => {
    status = next;
    events.emit('status', status);
  };

  if (enabled) {
    autoUpdater.autoDownload = true;
    // A test feed must never install anything behind your back; it only
    // installs when you press "Restart to update".
    autoUpdater.autoInstallOnAppQuit = !feedUrl;
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = {
      info: (m) => log('updater:', m),
      warn: (m) => log('updater warn:', m),
      error: (m) => log('updater error:', m),
      debug: () => {}
    };
    if (feedUrl) autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });

    autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => set({ state: 'downloading', version: info.version, percent: 0 }));
    autoUpdater.on('update-not-available', () => set({ state: 'none' }));
    autoUpdater.on('download-progress', (p) =>
      set({ state: 'downloading', version: status.version, percent: Math.round(p.percent) })
    );
    autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }));
    autoUpdater.on('error', (err) => set({ state: 'error', error: String((err && err.message) || err) }));
  }

  async function check() {
    if (!enabled || status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      // electron-updater also emits 'error'; this only guards against a rejection with no event.
      if (status.state !== 'error') set({ state: 'error', error: String((err && err.message) || err) });
    }
  }

  // Checks shortly after launch, then every few hours, while automatic updates are on.
  function schedule(auto) {
    clearTimeout(firstCheck);
    clearInterval(timer);
    firstCheck = timer = null;
    if (!enabled || !auto) return;
    firstCheck = setTimeout(check, FIRST_CHECK_DELAY_MS);
    timer = setInterval(check, CHECK_EVERY_MS);
  }

  function install() {
    if (status.state === 'ready') autoUpdater.quitAndInstall(true, true);
  }

  return {
    on: (event, cb) => events.on(event, cb),
    status: () => ({ ...status, text: describe(status) }),
    check,
    schedule,
    install
  };
}

module.exports = { createUpdater, describe, FIRST_CHECK_DELAY_MS, CHECK_EVERY_MS };
