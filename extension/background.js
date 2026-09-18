const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const ALARM_NAME = 'refresh-rates';
const REFRESH_MINUTES = 360;

async function fetchRates() {
  const res = await fetch(RATES_URL);
  if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error('Exchange rate API returned an error result');

  await chrome.storage.local.set({
    exchangeRates: {
      base: data.base_code,
      rates: data.rates,
      updatedAt: data.time_last_update_utc,
      fetchedAt: Date.now()
    }
  });
  return data;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_MINUTES });
  fetchRates().catch((err) => console.error('[Steam FX] initial rate fetch failed:', err));
});

chrome.runtime.onStartup.addListener(() => {
  fetchRates().catch((err) => console.error('[Steam FX] startup rate fetch failed:', err));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchRates().catch((err) => console.error('[Steam FX] periodic rate fetch failed:', err));
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'REFRESH_RATES') {
    fetchRates()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return undefined;
});
