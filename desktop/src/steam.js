// Everything that touches the Steam install: finding it, the remote-debugging
// flag file, and restarting the client.
//
// Steam's embedded browser opens a local debugging port at startup when a file
// named ".cef-enable-remote-debugging" exists in the Steam folder. That port is
// how Steam FX reaches the store pages inside the client.
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

const FLAG_NAME = '.cef-enable-remote-debugging';

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout) => resolve(err ? '' : String(stdout)));
  });
}

async function findSteamDir() {
  // Lets tests and curious users point at a different folder.
  if (process.env.STEAMFX_STEAM_DIR) return process.env.STEAMFX_STEAM_DIR;

  const out = await run('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath']);
  const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/i);
  const candidates = [];
  if (match) candidates.push(match[1].trim().replace(/\//g, '\\'));
  candidates.push('C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam');

  return candidates.find((dir) => fs.existsSync(path.join(dir, 'steam.exe'))) || null;
}

const flagPath = (dir) => path.join(dir, FLAG_NAME);
const isFlagPresent = (dir) => fs.existsSync(flagPath(dir));

// Returns whether we created the file. If the user already had it (for their
// own tools), we leave it alone, and won't remove it later either.
function enableFlag(dir) {
  if (isFlagPresent(dir)) return { created: false };
  fs.writeFileSync(flagPath(dir), '');
  return { created: true };
}

function removeFlag(dir) {
  fs.rmSync(flagPath(dir), { force: true });
}

async function isSteamRunning() {
  const out = await run('tasklist', ['/FI', 'IMAGENAME eq steam.exe', '/FO', 'CSV', '/NH']);
  return /"steam\.exe"/i.test(out);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Asks Steam to exit cleanly, waits for it to finish, then starts it again.
async function restartSteam(dir) {
  const exe = path.join(dir, 'steam.exe');

  if (await isSteamRunning()) {
    spawn(exe, ['-shutdown'], { detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 80 && (await isSteamRunning()); i++) await sleep(500);
    if (await isSteamRunning()) throw new Error('Steam did not close in time.');
  }

  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
}

module.exports = {
  FLAG_NAME,
  findSteamDir,
  flagPath,
  isFlagPresent,
  enableFlag,
  removeFlag,
  isSteamRunning,
  restartSteam
};
