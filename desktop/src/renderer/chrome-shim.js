// The popup from the browser extension talks to chrome.storage and
// chrome.runtime. This maps just those calls onto the desktop app's IPC, so
// popup.js can be reused as-is instead of forked.
(() => {
  const api = window.steamfx;
  const listeners = [];

  const withCallback = (promise, cb) => {
    if (typeof cb === 'function') promise.then(cb);
    return promise;
  };

  window.chrome = Object.assign(window.chrome || {}, {
    storage: {
      sync: {
        get: (_defaults, cb) => withCallback(api.getSettings(), cb),
        set: (patch) => api.setSettings(patch),
        // Main also drops the cached rates when settings are reset.
        clear: () => api.resetSettings()
      },
      local: {
        get: (_key, cb) => withCallback(api.getRates().then((exchangeRates) => ({ exchangeRates })), cb),
        remove: () => Promise.resolve()
      },
      onChanged: { addListener: (fn) => listeners.push(fn) }
    },
    runtime: {
      sendMessage: (message, cb) => {
        if (message && message.type === 'REFRESH_RATES') {
          api.refreshRates().then((result) => cb && cb(result));
        }
      }
    }
  });

  api.onRatesChanged((exchangeRates) => {
    listeners.forEach((fn) => fn({ exchangeRates: { newValue: exchangeRates } }, 'local'));
  });
})();
