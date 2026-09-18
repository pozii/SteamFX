// Runs inside Steam's store pages. It is the desktop counterpart of
// extension/content.js: same selectors, same conversion, but the settings and
// rates arrive in __STATE__ instead of chrome.storage.
//
// injection.js wraps this file together with the shared helpers
// (parsePriceText, convertAmount, formatMoney, ...), __STATE__ and __CSS__.

if (location.hostname === 'store.steampowered.com') {
  if (window.__steamFx) {
    window.__steamFx.update(__STATE__);
  } else {
    startSteamFx(__STATE__);
  }
}

function startSteamFx(initialState) {
  const PRICE_SELECTORS = [
    '.game_purchase_price',
    '.discount_final_price',
    '.discount_original_price',
    '.search_price',
    '.game_area_purchase_game .price'
  ];
  const DONE_CLASS = 'steam-fx-done';
  const ORIGINAL_TEXT_ATTR = 'data-steam-fx-original';
  const SKIP_TEXT = /free|ücretsiz|play game|demo|coming soon/i;

  let state = initialState;
  let rescanTimer = null;

  function detectSourceCurrency() {
    if (state.sourceCurrency && state.sourceCurrency !== 'auto') return state.sourceCurrency;
    return guessCurrencyFromMeta() || guessCurrencyFromCookie() || 'USD';
  }

  function processPrices() {
    if (!state.enabled || !state.rates) return;

    const source = detectSourceCurrency();
    const target = state.targetCurrency;

    document.querySelectorAll(PRICE_SELECTORS.join(',')).forEach((node) => {
      if (node.classList.contains(DONE_CLASS)) return;
      node.classList.add(DONE_CLASS);

      const text = node.textContent;
      if (!text || SKIP_TEXT.test(text)) return;
      if (source === target) return;

      const amount = parsePriceText(text);
      if (amount == null) return;

      const converted = convertAmount(amount, source, target, state.rates);
      if (converted == null) return;

      if (state.replacePrice) {
        const formatted = formatMoney(converted, target);
        const sourceHadCode = /\b[A-Z]{3}\b/.test(text);
        node.setAttribute(ORIGINAL_TEXT_ATTR, text);
        node.textContent = currencyNeedsCode(target) || sourceHadCode ? `${formatted} ${target}` : formatted;
      } else {
        const badge = document.createElement('span');
        badge.className = 'steam-fx-badge';
        badge.style.setProperty('--steam-fx-color', state.badgeColor);
        badge.textContent = `≈ ${formatMoney(converted, target)}`;
        node.insertAdjacentElement('afterend', badge);
      }
    });
  }

  function undoAll() {
    document.querySelectorAll(`[${ORIGINAL_TEXT_ATTR}]`).forEach((n) => {
      n.textContent = n.getAttribute(ORIGINAL_TEXT_ATTR);
      n.removeAttribute(ORIGINAL_TEXT_ATTR);
    });
    document.querySelectorAll(`.${DONE_CLASS}`).forEach((n) => n.classList.remove(DONE_CLASS));
    document.querySelectorAll('.steam-fx-badge').forEach((n) => n.remove());
  }

  function scheduleRescan() {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(processPrices, 300);
  }

  function boot() {
    const style = document.createElement('style');
    style.textContent = __CSS__;
    document.head.appendChild(style);

    processPrices();
    new MutationObserver(scheduleRescan).observe(document.body, { childList: true, subtree: true });
  }

  window.__steamFx = {
    update(next) {
      state = next;
      undoAll();
      processPrices();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
