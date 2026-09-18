// Builds the Windows installer. The version comes from extension/manifest.json,
// so the whole project (extension and desktop app) shares one version number and
// one release. Pass --version=x.y.z or --out=dir to override, e.g. to build a
// throwaway newer version for testing the updater.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1];
const root = path.join(__dirname, '..');

const manifest = JSON.parse(fs.readFileSync(path.join(root, '..', 'extension', 'manifest.json'), 'utf8'));
const version = arg('version') || manifest.version;

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(path.join(__dirname, 'prepare-shared.js'), []);

const builderArgs = ['--win', 'nsis', '--publish', 'never', `-c.extraMetadata.version=${version}`];
if (arg('out')) builderArgs.push(`-c.directories.output=${arg('out')}`);
run(path.join(root, 'node_modules', 'electron-builder', 'cli.js'), builderArgs);

console.log(`Built SteamFX ${version}`);
