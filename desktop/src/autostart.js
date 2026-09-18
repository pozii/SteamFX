// "Launch at startup" is a single value in the per-user Run key. The uninstaller
// deletes the same value (see build/installer.nsh), so keep the name in sync.
const { execFile } = require('child_process');

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const VALUE_NAME = 'SteamFX';

function reg(args) {
  return new Promise((resolve) => {
    execFile('reg', args, { windowsHide: true }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

async function isEnabled() {
  return (await reg(['query', RUN_KEY, '/v', VALUE_NAME])) !== null;
}

async function setEnabled(enabled, exePath) {
  if (enabled) {
    await reg(['add', RUN_KEY, '/v', VALUE_NAME, '/t', 'REG_SZ', '/d', `"${exePath}" --hidden`, '/f']);
  } else {
    await reg(['delete', RUN_KEY, '/v', VALUE_NAME, '/f']);
  }
}

module.exports = { isEnabled, setEnabled, VALUE_NAME };
