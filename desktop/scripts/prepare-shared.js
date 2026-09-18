// Copies the files the desktop app shares with the browser extension into
// src/vendor/. The extension stays the single source of truth for price
// parsing, currency names, defaults and the popup UI; nothing here is edited
// by hand and src/vendor/ is git-ignored.
const fs = require('fs');
const path = require('path');

const ext = path.join(__dirname, '..', '..', 'extension');
const out = path.join(__dirname, '..', 'src', 'vendor');

const files = [
  'shared/settings.js',
  'shared/currencies.js',
  'shared/utils.js',
  'shared/theme.css',
  'popup.js',
  'popup.css',
  'content.css',
  'icons/icon32.png'
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(ext, file), path.join(out, path.basename(file)));
}

console.log(`Copied ${files.length} shared files into src/vendor/`);
