// Tiny JSON file store. Everything the app persists lives in one file inside
// its own data folder, so deleting that folder removes every trace of it.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Reads DEFAULT_SETTINGS out of the extension's shared/settings.js so both
// apps always agree on the defaults.
function loadDefaultSettings() {
  const code = fs.readFileSync(path.join(__dirname, 'vendor', 'settings.js'), 'utf8');
  return JSON.parse(JSON.stringify(vm.runInNewContext(`${code}\n;DEFAULT_SETTINGS`)));
}

const DEFAULT_DESKTOP = {
  launchAtStartup: true,
  autoUpdate: true,
  steamIntegration: false,
  firstRunDone: false
};

function createStore(file, defaultSettings = loadDefaultSettings()) {
  let data = { settings: {}, rates: null, desktop: {} };

  try {
    data = { ...data, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    // first run, or an unreadable file: start from defaults
  }

  function save() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  }

  return {
    getSettings: () => ({ ...defaultSettings, ...data.settings }),
    setSettings(patch) {
      data.settings = { ...data.settings, ...patch };
      save();
    },
    resetSettings() {
      data.settings = {};
      data.rates = null;
      save();
    },
    getRates: () => data.rates,
    setRates(rates) {
      data.rates = rates;
      save();
    },
    getDesktop: () => ({ ...DEFAULT_DESKTOP, ...data.desktop }),
    setDesktop(patch) {
      data.desktop = { ...data.desktop, ...patch };
      save();
    }
  };
}

module.exports = { createStore, loadDefaultSettings };
