function guessCurrencyFromCookie() {
  const match = document.cookie.match(/steamCountry=([A-Z]{2})/);
  if (!match) return null;
  return COUNTRY_TO_CURRENCY[match[1]] || null;
}

function guessCurrencyFromMeta() {
  const el = document.querySelector('meta[itemprop="priceCurrency"]');
  return el ? el.getAttribute('content') : null;
}

// Steam formats prices per locale ("$59.99", "59,99€", "₺399,99", "R$ 79,90"),
// so we have to guess whether the comma or the dot is the decimal separator.
function parsePriceText(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let decimalSep = null;

  if (lastComma > -1 && lastDot > -1) {
    decimalSep = lastComma > lastDot ? ',' : '.';
  } else if (lastComma > -1) {
    const parts = cleaned.split(',');
    decimalSep = parts.length === 2 && parts[1].length === 2 ? ',' : null;
  } else if (lastDot > -1) {
    const parts = cleaned.split('.');
    decimalSep = parts.length === 2 && parts[1].length <= 2 ? '.' : null;
  }

  let normalized;
  if (decimalSep === ',') {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (decimalSep === '.') {
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned.replace(/[.,]/g, '');
  }

  const value = parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

function convertAmount(amount, from, to, rates) {
  if (!rates || !rates[from] || !rates[to]) return null;
  const usd = amount / rates[from];
  return usd * rates[to];
}

// Symbols that more than one currency uses ("$" is USD, CAD, AUD, MXN...).
// Steam adds the ISO code after these; a symbol like "₺" needs no help.
const AMBIGUOUS_SYMBOLS = new Set(['$', '¥', '£', 'kr']);

function currencySymbol(currencyCode) {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol'
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

function currencyNeedsCode(currencyCode) {
  return AMBIGUOUS_SYMBOLS.has(currencySymbol(currencyCode));
}

// Intl takes care of the symbol and decimal places, so there's no
// per-currency table to keep up to date.
function formatMoney(amount, currencyCode) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol'
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}
