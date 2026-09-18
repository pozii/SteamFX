(function () {
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

  let settings = null;
  let ratesData = null;
  let rescanTimer = null;

  async function loadState() {
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get(DEFAULT_SETTINGS),
      chrome.storage.local.get('exchangeRates')
    ]);
    settings = sync;
    ratesData = local.exchangeRates || null;
  }

  function detectSourceCurrency() {
    if (settings.sourceCurrency && settings.sourceCurrency !== 'auto') {
      return settings.sourceCurrency;
    }
    return guessCurrencyFromMeta() || guessCurrencyFromCookie() || 'USD';
  }

  function processPrices() {
    if (!settings?.enabled || !ratesData?.rates) return;

    const source = detectSourceCurrency();
    const target = settings.targetCurrency;
    const nodes = document.querySelectorAll(PRICE_SELECTORS.join(','));

    nodes.forEach((node) => {
      if (node.classList.contains(DONE_CLASS)) return;
      node.classList.add(DONE_CLASS);

      const text = node.textContent;
      if (!text || SKIP_TEXT.test(text)) return;
      if (source === target) return;

      const amount = parsePriceText(text);
      if (amount == null) return;

      const converted = convertAmount(amount, source, target, ratesData.rates);
      if (converted == null) return;

      if (settings.replacePrice) {
        // Overwrite the text in place so it keeps Steam's own font and
        // sizing. Tack on the ISO code when the symbol is shared ("$") or
        // Steam already printed one (bundles do, even for plain symbols).
        const formatted = formatMoney(converted, target);
        const sourceHadCode = /\b[A-Z]{3}\b/.test(text);
        node.setAttribute(ORIGINAL_TEXT_ATTR, text);
        node.textContent = currencyNeedsCode(target) || sourceHadCode ? `${formatted} ${target}` : formatted;
      } else {
        const badge = document.createElement('span');
        badge.className = 'steam-fx-badge';
        badge.style.setProperty('--steam-fx-color', settings.badgeColor);
        badge.textContent = `≈ ${formatMoney(converted, target)}`;
        node.insertAdjacentElement('afterend', badge);
      }
    });
  }

  function scheduleRescan() {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(processPrices, 300);
  }

  function observeDom() {
    const observer = new MutationObserver(scheduleRescan);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  chrome.storage.onChanged.addListener(() => {
    loadState().then(() => {
      document.querySelectorAll(`[${ORIGINAL_TEXT_ATTR}]`).forEach((n) => {
        n.textContent = n.getAttribute(ORIGINAL_TEXT_ATTR);
        n.removeAttribute(ORIGINAL_TEXT_ATTR);
      });
      document.querySelectorAll(`.${DONE_CLASS}`).forEach((n) => n.classList.remove(DONE_CLASS));
      document.querySelectorAll('.steam-fx-badge').forEach((n) => n.remove());
      processPrices();
    });
  });

  loadState().then(() => {
    processPrices();
    observeDom();
  });
})();
