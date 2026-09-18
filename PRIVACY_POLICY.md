# Privacy Policy — Steam FX Currency Converter

Last updated: 2026-09-18

Steam FX does not collect, store, transmit, or sell any personal data. This applies to both the browser extension and the Windows desktop app.

## What the extension does

- Reads prices on pages you visit at `store.steampowered.com` to display a converted amount.
- Fetches public, non-personal exchange rate data from `open.er-api.com`.
- Saves your chosen settings (target currency, source currency, badge color, on/off state) locally in your browser via the `chrome.storage` API.

## What the desktop app does

- Fetches the same public exchange rate data from `open.er-api.com`.
- Saves your settings and the cached rates in a folder on your PC (`%APPDATA%\SteamFX`), along with a small log file. None of it leaves your device.
- To convert prices in the Steam app, it adds an empty file named `.cef-enable-remote-debugging` to your Steam folder. After Steam restarts, the app connects to Steam's local debugging port (`127.0.0.1:8080`, reachable only from your own PC) to read and update prices on Steam store pages, as the extension does.
- Checks for updates by asking GitHub (`github.com`) for the latest release information and, when there is a newer version, downloading its installer from there. GitHub sees the request the way any website does (your IP address and the app's name and version). Nothing else about you or your PC is sent, and you can turn automatic checks off in the settings.
- Uninstalling the app removes its folder, its startup entry, its downloaded updates and that file (when the app created it).

## What it does not do

- It does not send your browsing activity, purchases, account information, or any other personal data anywhere.
- It does not use analytics, tracking pixels, or third-party advertising SDKs.
- The extension does not communicate with any server other than the public exchange-rate API listed above. The desktop app additionally contacts GitHub for updates, as described above, and its connection to Steam stays on your own machine.
- Settings saved via `chrome.storage` stay on your device (or sync through your own Google account if Chrome Sync is enabled) and are never sent to the developer.

## Third-party services

- **open.er-api.com** — provides publicly available currency exchange rates. No user-identifying data is sent in these requests; only a request for the current rate table is made.
- **GitHub** (desktop app only) — hosts the releases the app's updater checks and downloads.

## Changes to this policy

If this policy changes, the update will be reflected here with a new "Last updated" date.

## Contact

For questions about this policy, contact the developer through the support channel listed on the Chrome Web Store listing.
