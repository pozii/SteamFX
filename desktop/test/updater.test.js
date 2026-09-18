const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const { createUpdater } = require('../src/updater');

// Stand-in for electron-updater's autoUpdater.
function fakeAutoUpdater({ onCheck } = {}) {
  const fake = new EventEmitter();
  fake.checkForUpdates = async () => onCheck && onCheck(fake);
  fake.setFeedURL = (feed) => (fake.feed = feed);
  fake.quitAndInstall = (...args) => (fake.installed = args);
  return fake;
}

test('does nothing when updates are disabled (running from source)', async () => {
  const au = fakeAutoUpdater({ onCheck: () => assert.fail('should not check') });
  const updater = createUpdater({ autoUpdater: au, enabled: false });
  await updater.check();
  assert.strictEqual(updater.status().state, 'disabled');
});

test('walks from checking to up to date', async () => {
  const au = fakeAutoUpdater({
    onCheck: (a) => {
      a.emit('checking-for-update');
      a.emit('update-not-available', { version: '0.1.0' });
    }
  });
  const updater = createUpdater({ autoUpdater: au, enabled: true });
  const seen = [];
  updater.on('status', (s) => seen.push(s.state));
  await updater.check();
  assert.deepStrictEqual(seen, ['checking', 'none']);
});

test('downloads in the background, then offers to restart', async () => {
  const au = fakeAutoUpdater({
    onCheck: (a) => {
      a.emit('update-available', { version: '0.2.0' });
      a.emit('download-progress', { percent: 41.6 });
      a.emit('update-downloaded', { version: '0.2.0' });
    }
  });
  const updater = createUpdater({ autoUpdater: au, enabled: true });
  let midway;
  updater.on('status', (s) => s.state === 'downloading' && s.percent && (midway = updater.status().text));
  await updater.check();

  assert.match(midway, /Downloading v0\.2\.0 \(42%\)/);
  assert.strictEqual(updater.status().state, 'ready');
  assert.match(updater.status().text, /v0\.2\.0 is ready/);
});

test('restart-to-update only works once an update is ready, and installs silently', async () => {
  const au = fakeAutoUpdater({ onCheck: (a) => a.emit('update-downloaded', { version: '0.2.0' }) });
  const updater = createUpdater({ autoUpdater: au, enabled: true });

  updater.install();
  assert.strictEqual(au.installed, undefined);

  await updater.check();
  updater.install();
  assert.deepStrictEqual(au.installed, [true, true]);
});

test('a failed check becomes an error state instead of throwing', async () => {
  const au = fakeAutoUpdater({
    onCheck: () => {
      throw new Error('404');
    }
  });
  const updater = createUpdater({ autoUpdater: au, enabled: true });
  await assert.doesNotReject(() => updater.check());
  assert.strictEqual(updater.status().state, 'error');
});

test('a custom feed URL is used for testing updates and never installs on quit', () => {
  const au = fakeAutoUpdater();
  createUpdater({ autoUpdater: au, enabled: true, feedUrl: 'http://127.0.0.1:8099' });
  assert.deepStrictEqual(au.feed, { provider: 'generic', url: 'http://127.0.0.1:8099' });
  assert.strictEqual(au.autoInstallOnAppQuit, false);
});

test('real updates install on quit', () => {
  const au = fakeAutoUpdater();
  createUpdater({ autoUpdater: au, enabled: true });
  assert.strictEqual(au.autoInstallOnAppQuit, true);
  assert.strictEqual(au.autoDownload, true);
});
