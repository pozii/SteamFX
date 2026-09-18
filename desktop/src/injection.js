const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');

// Builds the script that gets injected into Steam's store pages: the shared
// helpers from the extension, followed by the desktop-side page logic.
// `state` is the user's settings plus the rate table ({ ..., rates }).
function buildInjection(state) {
  return [
    '(function () {',
    read('vendor', 'currencies.js'),
    read('vendor', 'utils.js'),
    `const __STATE__ = ${JSON.stringify(state)};`,
    `const __CSS__ = ${JSON.stringify(read('vendor', 'content.css'))};`,
    read('injected', 'core.js'),
    '})();'
  ].join('\n');
}

module.exports = { buildInjection };
