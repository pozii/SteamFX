// Rough guess at a Steam account's currency from the "steamCountry" cookie
// (ISO 3166-1 alpha-2). It only feeds auto-detect and can be overridden in
// the popup. It doesn't limit what you can pick; that list comes from the
// exchange rate API.
const COUNTRY_TO_CURRENCY = {
  // Africa
  DZ: 'DZD', AO: 'AOA', BJ: 'XOF', BW: 'BWP', BF: 'XOF', BI: 'BIF',
  CV: 'CVE', CM: 'XAF', CF: 'XAF', TD: 'XAF', KM: 'KMF', CG: 'XAF',
  CD: 'CDF', CI: 'XOF', DJ: 'DJF', EG: 'EGP', GQ: 'XAF', ER: 'ERN',
  SZ: 'SZL', ET: 'ETB', GA: 'XAF', GM: 'GMD', GH: 'GHS', GN: 'GNF',
  GW: 'XOF', KE: 'KES', LS: 'LSL', LR: 'LRD', LY: 'LYD', MG: 'MGA',
  MW: 'MWK', ML: 'XOF', MR: 'MRU', MU: 'MUR', MA: 'MAD', MZ: 'MZN',
  NA: 'NAD', NE: 'XOF', NG: 'NGN', RW: 'RWF', ST: 'STN', SN: 'XOF',
  SC: 'SCR', SL: 'SLL', SO: 'SOS', ZA: 'ZAR', SS: 'SSP', SD: 'SDG',
  TZ: 'TZS', TG: 'XOF', TN: 'TND', UG: 'UGX', ZM: 'ZMW', ZW: 'ZWL',

  // Americas
  AG: 'XCD', AR: 'ARS', AW: 'AWG', BS: 'BSD', BB: 'BBD', BZ: 'BZD',
  BO: 'BOB', BR: 'BRL', CA: 'CAD', CL: 'CLP', CO: 'COP', CR: 'CRC',
  CU: 'CUP', DM: 'XCD', DO: 'DOP', EC: 'USD', SV: 'USD', GD: 'XCD',
  GT: 'GTQ', GY: 'GYD', HT: 'HTG', HN: 'HNL', JM: 'JMD', MX: 'MXN',
  NI: 'NIO', PA: 'USD', PY: 'PYG', PE: 'PEN', KN: 'XCD', LC: 'XCD',
  VC: 'XCD', SR: 'SRD', TT: 'TTD', US: 'USD', UY: 'UYU', VE: 'VES',
  KY: 'KYD', BM: 'BMD', VG: 'USD', TC: 'USD', AI: 'XCD', MS: 'XCD',
  PR: 'USD',

  // Asia
  AF: 'AFN', AM: 'AMD', AZ: 'AZN', BH: 'BHD', BD: 'BDT', BT: 'BTN',
  BN: 'BND', KH: 'KHR', CN: 'CNY', GE: 'GEL', HK: 'HKD', IN: 'INR',
  ID: 'IDR', IR: 'IRR', IQ: 'IQD', IL: 'ILS', JP: 'JPY', JO: 'JOD',
  KZ: 'KZT', KW: 'KWD', KG: 'KGS', LA: 'LAK', LB: 'LBP', MO: 'MOP',
  MY: 'MYR', MV: 'MVR', MN: 'MNT', MM: 'MMK', NP: 'NPR', KP: 'KPW',
  OM: 'OMR', PK: 'PKR', PH: 'PHP', QA: 'QAR', SA: 'SAR', SG: 'SGD',
  KR: 'KRW', LK: 'LKR', SY: 'SYP', TW: 'TWD', TJ: 'TJS', TH: 'THB',
  TL: 'USD', TM: 'TMT', AE: 'AED', UZ: 'UZS', VN: 'VND', YE: 'YER',
  PS: 'ILS',

  // Europe
  AL: 'ALL', AD: 'EUR', AT: 'EUR', BY: 'BYN', BE: 'EUR', BA: 'BAM',
  BG: 'BGN', HR: 'EUR', CY: 'EUR', CZ: 'CZK', DK: 'DKK', EE: 'EUR',
  FO: 'DKK', FI: 'EUR', FR: 'EUR', DE: 'EUR', GI: 'GIP', GR: 'EUR',
  GL: 'DKK', HU: 'HUF', IS: 'ISK', IE: 'EUR', IM: 'GBP', IT: 'EUR',
  JE: 'GBP', GG: 'GBP', XK: 'EUR', LV: 'EUR', LI: 'CHF', LT: 'EUR',
  LU: 'EUR', MT: 'EUR', MD: 'MDL', MC: 'EUR', ME: 'EUR', NL: 'EUR',
  MK: 'MKD', NO: 'NOK', PL: 'PLN', PT: 'EUR', RO: 'RON', RU: 'RUB',
  SM: 'EUR', RS: 'RSD', SK: 'EUR', SI: 'EUR', ES: 'EUR', SE: 'SEK',
  CH: 'CHF', UA: 'UAH', GB: 'GBP', VA: 'EUR', FK: 'FKP', SH: 'SHP',
  TR: 'TRY',

  // Oceania
  AU: 'AUD', FJ: 'FJD', KI: 'AUD', MH: 'USD', FM: 'USD', NR: 'AUD',
  NZ: 'NZD', PW: 'USD', PG: 'PGK', WS: 'WST', SB: 'SBD', TO: 'TOP',
  TV: 'AUD', VU: 'VUV', CK: 'NZD', NU: 'NZD', TK: 'NZD', PF: 'XPF',
  NC: 'XPF', WF: 'XPF', GU: 'USD', AS: 'USD', MP: 'USD', VI: 'USD',
  CX: 'AUD', CC: 'AUD', NF: 'AUD', PN: 'NZD'
};

// Currency name from the browser's Intl API, so any code the rates API
// returns gets a readable label for free.
function getCurrencyName(code) {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
}
