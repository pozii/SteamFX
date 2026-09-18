const fs = require('fs');
const path = require('path');

const MAX_BYTES = 256 * 1024;
let file = null;

function init(dir) {
  file = path.join(dir, 'steamfx.log');
  try {
    if (fs.statSync(file).size > MAX_BYTES) fs.writeFileSync(file, '');
  } catch {
    // no log yet
  }
}

function log(...parts) {
  const line = `${new Date().toISOString()} ${parts.map(String).join(' ')}\n`;
  if (!file) return;
  try {
    fs.appendFileSync(file, line);
  } catch {
    // logging must never break the app
  }
}

module.exports = { init, log };
