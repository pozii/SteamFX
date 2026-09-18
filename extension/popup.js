const mainScreen = document.getElementById('mainScreen');
const settingsScreen = document.getElementById('settingsScreen');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');

settingsBtn.addEventListener('click', () => {
  mainScreen.hidden = true;
  settingsScreen.hidden = false;
});

backBtn.addEventListener('click', () => {
  settingsScreen.hidden = true;
  mainScreen.hidden = false;
});

const enabledEl = document.getElementById('enabled');
const sourceHintEl = document.getElementById('sourceHint');
const ratesStatusEl = document.getElementById('ratesStatus');
const refreshBtn = document.getElementById('refreshBtn');
const replacePriceEl = document.getElementById('replacePrice');
const badgeColorEl = document.getElementById('badgeColor');
const resetBadgeColorBtn = document.getElementById('resetBadgeColor');
const resetBtn = document.getElementById('resetBtn');
const resetStatusEl = document.getElementById('resetStatus');

function currencyOptionLabel(code) {
  return `${code} — ${getCurrencyName(code)}`;
}

function buildCurrencyOptions(rates, includeAuto) {
  const codes = rates ? Object.keys(rates).sort() : [];
  const options = codes.map((code) => ({ value: code, label: currencyOptionLabel(code) }));
  return includeAuto ? [{ value: 'auto', label: 'Auto-detect' }, ...options] : options;
}

// Searchable dropdown. Trigger, search box and list all live inside one
// wrapper, unlike a native <select> whose popup the OS draws outside the page.
function createCombobox(root, onChange) {
  const trigger = root.querySelector('.combobox-trigger');
  const valueEl = root.querySelector('.combobox-value');
  const panel = root.querySelector('.combobox-panel');
  const searchInput = root.querySelector('.combobox-search');
  const list = root.querySelector('.combobox-list');

  let options = [];
  let filtered = [];
  let selectedValue = null;
  let activeIndex = -1;

  function renderList() {
    list.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement('li');
      empty.className = 'combobox-empty';
      empty.textContent = 'No matches';
      list.appendChild(empty);
      return;
    }

    filtered.forEach((opt, i) => {
      const item = document.createElement('li');
      item.setAttribute('role', 'option');
      item.dataset.index = i;
      item.className = 'combobox-item';
      if (opt.value === selectedValue) item.classList.add('is-selected');
      if (i === activeIndex) item.classList.add('is-active');
      item.textContent = opt.label;
      list.appendChild(item);
    });
  }

  function setActive(index) {
    activeIndex = Math.max(0, Math.min(index, filtered.length - 1));
    list.querySelectorAll('.combobox-item').forEach((el, i) => {
      el.classList.toggle('is-active', i === activeIndex);
    });
    const activeEl = list.children[activeIndex];
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function filterOptions(query) {
    const q = query.trim().toLowerCase();
    filtered = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    renderList();
    const selectedIndex = filtered.findIndex((o) => o.value === selectedValue);
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }

  function open() {
    if (trigger.disabled) return;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    searchInput.value = '';
    filterOptions('');
    searchInput.focus();
  }

  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  function isOpen() {
    return !panel.hidden;
  }

  function commit(value) {
    const opt = options.find((o) => o.value === value);
    if (!opt) return;
    selectedValue = value;
    valueEl.textContent = opt.label;
    close();
    onChange(value);
  }

  trigger.addEventListener('click', () => (isOpen() ? close() : open()));

  searchInput.addEventListener('input', () => filterOptions(searchInput.value));

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commit(opt.value);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.combobox-item');
    if (!item) return;
    const opt = filtered[Number(item.dataset.index)];
    if (opt) commit(opt.value);
  });

  document.addEventListener('click', (e) => {
    if (isOpen() && !root.contains(e.target)) close();
  });

  return {
    setOptions(newOptions) {
      options = newOptions;
    },
    setValue(value, fallbackLabel) {
      selectedValue = value;
      const opt = options.find((o) => o.value === value);
      valueEl.textContent = opt ? opt.label : fallbackLabel;
    },
    setDisabled(disabled) {
      trigger.disabled = disabled;
      if (disabled) close();
    }
  };
}

const targetCombobox = createCombobox(document.querySelector('[data-combobox="target"]'), (value) => {
  chrome.storage.sync.set({ targetCurrency: value });
});

const sourceCombobox = createCombobox(document.querySelector('[data-combobox="source"]'), (value) => {
  chrome.storage.sync.set({ sourceCurrency: value });
  sourceHintEl.textContent =
    value === 'auto' ? 'Guessed from your Steam region. Override it if it looks wrong.' : '';
});

function renderRatesStatus(exchangeRates) {
  if (!exchangeRates) {
    ratesStatusEl.textContent = 'Rates unavailable';
    return;
  }
  const date = new Date(exchangeRates.fetchedAt);
  ratesStatusEl.textContent = `Updated ${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })}`;
}

async function refreshView() {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(DEFAULT_SETTINGS),
    chrome.storage.local.get('exchangeRates')
  ]);
  const rates = local.exchangeRates ? local.exchangeRates.rates : null;

  enabledEl.checked = sync.enabled;
  replacePriceEl.checked = sync.replacePrice;
  badgeColorEl.value = sync.badgeColor;

  targetCombobox.setOptions(buildCurrencyOptions(rates, false));
  sourceCombobox.setOptions(buildCurrencyOptions(rates, true));
  targetCombobox.setDisabled(!rates);
  sourceCombobox.setDisabled(!rates);

  if (rates) {
    targetCombobox.setValue(sync.targetCurrency);
    sourceCombobox.setValue(sync.sourceCurrency, 'Auto-detect');
  } else {
    targetCombobox.setValue(null, 'Loading…');
    sourceCombobox.setValue(null, 'Loading…');
  }

  sourceHintEl.textContent =
    sync.sourceCurrency === 'auto' ? 'Guessed from your Steam region. Override it if it looks wrong.' : '';

  renderRatesStatus(local.exchangeRates || null);
}

enabledEl.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
});

replacePriceEl.addEventListener('change', () => {
  chrome.storage.sync.set({ replacePrice: replacePriceEl.checked });
});

badgeColorEl.addEventListener('input', () => {
  chrome.storage.sync.set({ badgeColor: badgeColorEl.value });
});

resetBadgeColorBtn.addEventListener('click', () => {
  badgeColorEl.value = DEFAULT_SETTINGS.badgeColor;
  chrome.storage.sync.set({ badgeColor: DEFAULT_SETTINGS.badgeColor });
});

resetBtn.addEventListener('click', async () => {
  const confirmed = window.confirm(
    'This will reset every Steam FX setting to its default value and clear the cached exchange rates. This cannot be undone.\n\nContinue?'
  );
  if (!confirmed) return;

  await chrome.storage.sync.clear();
  await chrome.storage.local.remove('exchangeRates');
  chrome.runtime.sendMessage({ type: 'REFRESH_RATES' }, () => refreshView());

  resetStatusEl.hidden = false;
  setTimeout(() => {
    resetStatusEl.hidden = true;
  }, 4000);
});

refreshBtn.addEventListener('click', () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Refreshing…';
  chrome.runtime.sendMessage({ type: 'REFRESH_RATES' }, () => {
    refreshView().finally(() => {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh';
    });
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.exchangeRates) {
    refreshView();
  }
});

refreshView();

chrome.storage.local.get('exchangeRates', ({ exchangeRates }) => {
  if (!exchangeRates) {
    chrome.runtime.sendMessage({ type: 'REFRESH_RATES' }, () => refreshView());
  }
});
