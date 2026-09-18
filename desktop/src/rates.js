const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const REFRESH_MS = 6 * 60 * 60 * 1000;

// Same shape the extension caches: { base, rates, updatedAt, fetchedAt }.
async function fetchRates(fetchImpl = fetch) {
  const res = await fetchImpl(RATES_URL);
  if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error('Exchange rate API returned an error result');
  return {
    base: data.base_code,
    rates: data.rates,
    updatedAt: data.time_last_update_utc,
    fetchedAt: Date.now()
  };
}

module.exports = { fetchRates, REFRESH_MS };
