# Chrome Web Store — Listing Draft

Reference text for filling out the Developer Dashboard. Not part of the extension package itself.

## Package to upload

A zip of the contents of `extension/` (so `manifest.json` is at the zip root). `*.zip` is git-ignored.

## Title

Steam FX — Currency Converter

## Category

Shopping (or: Productivity)

## Short description (max 132 characters)

Shows Steam store prices converted to your currency, using live exchange rates.

## Detailed description

Steam FX adds a converted price next to (or instead of) every price on the Steam store, using live exchange rates — no account, no sign-up, no manual currency entry.

How it works:
- Pick any currency to convert to — the full list (150+ currencies) is pulled live, nothing is hardcoded.
- Steam's price format is detected automatically from your account/region; override it manually if it's wrong.
- Prices are converted right on the page: game pages, search results, wishlists, and discount listings.
- Optionally replace the original price entirely instead of showing both.
- Customize the badge color, refresh rates on demand, and reset everything back to defaults at any time.

Exchange rates are fetched from a free public rate API and refreshed automatically every 6 hours.

This is an independent project and is not affiliated with, endorsed by, or sponsored by Valve Corporation or Steam.

## Privacy practices (Developer Dashboard form)

- **Single purpose**: Converts and displays Steam store prices in a currency chosen by the user, using live exchange rate data.
- **Permission justifications**:
  - `storage` — saves the user's chosen currencies and display settings locally.
  - `alarms` — schedules the periodic (every 6 hours) background refresh of exchange rates.
  - Host permission `store.steampowered.com` — needed to read and annotate prices shown on Steam store pages.
  - Host permission `open.er-api.com` — the exchange-rate API the extension fetches public rate data from.
- **Data collection**: None. Select "No" for every data type (personally identifiable info, financial info, health info, authentication info, personal communications, location, web history, user activity, website content). No data is collected, transmitted to the developer, or sold.
- **Remote code**: None — all code ships in the package.
- Link to `PRIVACY_POLICY.md` (host it somewhere public, e.g. a GitHub Gist or a simple static page) in the "Privacy policy URL" field.

## Screenshots

Chrome Web Store requires at least one real screenshot (1280×800 or 640×400) of the extension actually running. Take these yourself from a live Steam page with the extension active — mockups/fabricated screenshots violate the store's policies. Good candidates:
1. A game page with the converted price badge visible.
2. The popup open, showing the currency picker.
3. The settings screen (badge color / reset).
