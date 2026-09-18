const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const steam = require('../src/steam');

const dirs = [];
const tmpSteamDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steamfx-steam-'));
  dirs.push(dir);
  return dir;
};

test.after(() => dirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

test('creates the flag file and says it did', () => {
  const dir = tmpSteamDir();
  assert.deepStrictEqual(steam.enableFlag(dir), { created: true });
  assert.ok(fs.existsSync(path.join(dir, '.cef-enable-remote-debugging')));
  assert.ok(steam.isFlagPresent(dir));
});

test('leaves a flag file the user already had, and reports it was not ours', () => {
  const dir = tmpSteamDir();
  fs.writeFileSync(steam.flagPath(dir), '');
  assert.deepStrictEqual(steam.enableFlag(dir), { created: false });
});

test('removeFlag deletes it and is safe to call twice', () => {
  const dir = tmpSteamDir();
  steam.enableFlag(dir);
  steam.removeFlag(dir);
  steam.removeFlag(dir);
  assert.strictEqual(steam.isFlagPresent(dir), false);
});

test('STEAMFX_STEAM_DIR overrides Steam discovery', async () => {
  process.env.STEAMFX_STEAM_DIR = 'X:\\somewhere';
  try {
    assert.strictEqual(await steam.findSteamDir(), 'X:\\somewhere');
  } finally {
    delete process.env.STEAMFX_STEAM_DIR;
  }
});
