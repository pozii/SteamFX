const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStore, loadDefaultSettings } = require('../src/store');

const dirs = [];
const tmpFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steamfx-store-'));
  dirs.push(dir);
  return path.join(dir, 'config.json');
};

test.after(() => dirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

test('starts from the extension defaults', () => {
  const store = createStore(tmpFile());
  assert.deepStrictEqual(store.getSettings(), loadDefaultSettings());
  assert.strictEqual(store.getRates(), null);
});

test('settings survive a restart and only store what changed', () => {
  const file = tmpFile();
  createStore(file).setSettings({ targetCurrency: 'TRY' });

  const reopened = createStore(file);
  assert.strictEqual(reopened.getSettings().targetCurrency, 'TRY');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).settings, { targetCurrency: 'TRY' });
});

test('reset brings back the defaults and drops the cached rates', () => {
  const store = createStore(tmpFile());
  store.setSettings({ enabled: false });
  store.setRates({ base: 'USD', rates: { USD: 1 }, fetchedAt: 1 });
  store.resetSettings();

  assert.deepStrictEqual(store.getSettings(), loadDefaultSettings());
  assert.strictEqual(store.getRates(), null);
});

test('desktop options are kept apart from the conversion settings', () => {
  const store = createStore(tmpFile());
  assert.strictEqual(store.getDesktop().launchAtStartup, true);
  assert.strictEqual(store.getDesktop().autoUpdate, true);

  store.setDesktop({ launchAtStartup: false });
  store.resetSettings();
  assert.strictEqual(store.getDesktop().launchAtStartup, false);
});

test('a corrupt config file falls back to defaults instead of crashing', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{ not json');
  assert.deepStrictEqual(createStore(file).getSettings(), loadDefaultSettings());
});
