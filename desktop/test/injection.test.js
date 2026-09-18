const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const { buildInjection } = require('../src/injection');
const { isStoreUrl } = require('../src/injector');

const state = {
  enabled: true,
  targetCurrency: 'EUR',
  sourceCurrency: 'auto',
  replacePrice: false,
  badgeColor: '#67c1f5',
  rates: { USD: 1, EUR: 0.9 }
};

test('the injected script is valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(buildInjection(state)));
});

test('the current settings and rates are embedded in the script', () => {
  const source = buildInjection({ ...state, targetCurrency: 'TRY' });
  assert.match(source, /"targetCurrency":"TRY"/);
  assert.match(source, /"EUR":0\.9/);
});

test('on a page that is not the Steam store it does nothing', () => {
  const window = {};
  const context = { window, location: { hostname: 'example.com' }, document: {} };
  vm.runInNewContext(buildInjection(state), context);
  assert.strictEqual(window.__steamFx, undefined);
});

test('only Steam store pages are picked up', () => {
  assert.ok(isStoreUrl('https://store.steampowered.com/app/413150/'));
  assert.ok(!isStoreUrl('https://steamcommunity.com/market/'));
  assert.ok(!isStoreUrl('https://store.steampowered.com.evil.example/app/1/'));
  assert.ok(!isStoreUrl(undefined));
});
