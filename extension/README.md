# Steam FX browser extension

A Manifest V3 extension for Chromium browsers. For the big picture see the [root README](../README.md), and for how to use it see the [guide](../docs/GUIDE.md).

## Running it locally

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.

After you change some code, press the reload icon on the extension's card. If you touched a content script, refresh the Steam tab as well.

## What's where

```
manifest.json         Manifest V3 definition
background.js         Service worker; fetches and caches exchange rates
content.js            Finds prices on Steam pages and adds the conversions
content.css           Style for the conversion badge
popup.html/js/css     The toolbar popup, currency picker and settings
shared/settings.js    Default settings, used by the popup and content script
shared/theme.css      Color tokens; follows the OS light/dark setting
shared/currencies.js  Country to currency guesses, plus currency names
shared/utils.js       Price parsing, conversion and formatting
icons/                Extension icons
```

## Storage

Settings live in `chrome.storage.sync`: `enabled`, `targetCurrency`, `sourceCurrency`, `replacePrice` and `badgeColor`. Defaults are in `shared/settings.js`.

The cached rate table lives in `chrome.storage.local` under `exchangeRates`, shaped like `{ base, rates, updatedAt, fetchedAt }`.

## Packaging

For a store upload, zip the contents of this folder so `manifest.json` sits at the root of the zip. Zips are git-ignored.
