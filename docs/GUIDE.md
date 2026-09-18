# Steam FX user guide

Steam FX shows a converted price next to the prices on the Steam store, so you can see what a game costs in a currency you know. This guide covers installing it, using it, and what to do when something looks off.

There are two ways to use it: the browser extension for the Steam website, and the Windows tray app for the Steam app. Most of this guide is about the extension. The tray app has [its own section](#the-windows-tray-app) further down.

## Install

Steam FX isn't on the Chrome Web Store yet, so you load it by hand:

1. Download the latest `steam-fx-extension` zip from [the latest release](https://github.com/pozii/SteamFX/releases/latest) and unzip it somewhere you'll keep it. Chrome reads the extension from that folder, so don't delete it afterwards. (You can also clone the repo and use its `extension` folder.)
2. Open `chrome://extensions` (in Edge it's `edge://extensions`).
3. Turn on **Developer mode** in the top right.
4. Click **Load unpacked** and choose the unzipped folder.
5. If you like, pin Steam FX from the puzzle-piece menu so the icon stays in view.

It works in Chromium-based browsers like Chrome, Edge and Brave.

## Getting started

1. Click the Steam FX icon.
2. Under **Convert to**, pick the currency you want. The list is searchable, so you can type a code like `TRY` or a name like `lira`.
3. Open a page on `store.steampowered.com`. A badge like `≈ €12.34` appears next to each price.

Steam FX works out which currency Steam is showing you from your region. If the amounts look wrong, set **Store currency** yourself (more on that below).

## Settings

### Main screen

- **On/off switch** turns conversion off everywhere without uninstalling anything.
- **Convert to** is the currency you want to see. The default is `EUR`.
- **Store currency** is the currency Steam is showing. `Auto-detect` (the default) guesses from your Steam region. Pick a currency here to override it.
- **Refresh** grabs new exchange rates right now instead of waiting for the automatic update.

The footer shows when the rates were last updated. They refresh on their own every 6 hours.

### Settings screen (the gear icon)

- **Replace original price** swaps the price for the converted one instead of adding a badge beside it. When a symbol is shared between currencies, the code gets added too, so `$` turns into `12.34 USD`. The same happens where Steam's own price already showed a code. Off by default.
- **Badge color** changes the color of the `≈` badge. It only matters while *Replace original price* is off. **Reset** puts the default back.
- **Reset everything** restores every setting to its default and clears the cached rates. It asks you to confirm first, and there's no undo.

## Where prices get converted

- Game pages, including bundles
- Search results
- Discount listings, for both the original and the sale price

Free games, demos and "coming soon" items are left alone. Anything that loads while you scroll or filter is converted as it appears.

Only `store.steampowered.com` is covered. The Steam Community Market isn't.

## The Windows tray app

The tray app converts prices inside the Steam app, the same way the extension does on the website. It lives in your system tray, and you change the currency and other settings from there.

### Install

1. Download `SteamFX-Setup-<version>.exe` from [the latest release](https://github.com/pozii/SteamFX/releases/latest) and run it. It installs for your user only, so there's no admin prompt.
2. Windows may show a SmartScreen warning because the installer isn't signed yet. Choose **More info**, then **Run anyway**.
3. A small window opens on first launch. If you can't find the tray icon later, click the `^` arrow next to the clock. Windows 11 often hides new icons there.

### Turn it on for the Steam app

1. Pick your currency under **Convert to**.
2. Switch on **Convert prices in the Steam app**.
3. Restart Steam once. The window has a **Restart Steam** button, or you can do it from the tray menu. Steam FX asks before it closes anything.

After that it connects by itself every time Steam starts, and the status line in the window says **Connected**. Open the Store tab in Steam and prices show the same `≈` badges as in the browser.

Steam FX has to be running for this to work, so **Launch at startup** is on by default. You can switch it off in the settings screen (gear icon), or from **Launch at startup** in the tray menu.

### Updates

The tray app checks GitHub for a newer version shortly after it starts and every few hours after that. When there is one, it downloads in the background and installs the next time you quit Steam FX, or right away if you choose **Restart to update** in the tray menu or the settings screen. Your settings are kept.

Don't want automatic checks? Switch off **Update automatically** in the settings screen. **Check for updates** there (and in the tray menu) still works whenever you like.

### The tray menu

Right-click the tray icon for the quick things: turning conversion on or off, the current currency, Steam's connection status, refreshing exchange rates, launch at startup, and Quit. Left-click opens the settings window, which is the same popup as the extension's plus the Steam app switch.

The tray app and the extension keep separate settings, so set the currency in each one.

### Uninstall

Remove **SteamFX** in Windows Settings, Apps. It takes everything with it: the program, the startup entry, its settings folder, the small file it adds to your Steam folder, downloaded updates, and the entries Windows keeps for the tray icon. Everything Steam FX created is removed.

### If it isn't converting

- **The status says "Almost there" or "restart needed".** Steam only opens its debugging port when it starts, so restart Steam once.
- **The status says "Waiting for Steam".** Steam isn't running yet. It connects on its own once Steam starts.
- **It says Steam wasn't found.** Steam FX looks in the registry and in the usual install folders. If yours is somewhere unusual, open an issue.
- **Something else is using port 8080.** Steam's debugging port is fixed at 8080, so another program on that port gets in the way.
- **Still nothing.** Open `%APPDATA%\SteamFX\steamfx.log` and attach it to an [issue](https://github.com/pozii/SteamFX/issues). It lists what Steam exposed and whether Steam FX attached.

## Troubleshooting

**I don't see any badges.**
Check that the switch in the popup is on. Then look at the footer: if it says *Rates unavailable*, press **Refresh** (you need an internet connection, since rates come from `open.er-api.com`). If Steam tabs were open when you installed the extension, reload them once.

**The converted amount looks wrong.**
Auto-detect is only a guess. Open the popup and set **Store currency** to whatever your Steam account really uses.

**One price wasn't converted.**
Steam has a few different page layouts and Steam FX only knows the price elements it has seen. If you find one it misses, [open an issue](https://github.com/pozii/SteamFX/issues) with the page URL and a screenshot.

**My code changes don't show up.**
Press the reload icon on the extension's card in `chrome://extensions`, then refresh the Steam tab.

## FAQ

**Does Steam FX collect my data?**
No. Your settings stay on your device, and the only network request the extension makes goes to a public exchange-rate API. The tray app also asks GitHub whether there's a newer version. The [privacy policy](../PRIVACY_POLICY.md) has the details.

**How accurate are the rates?**
They're mid-market reference rates, updated every 6 hours. Your bank or payment provider uses its own rate and adds fees, so treat the badge as an estimate.

**Is this connected to Valve?**
No, it's an independent community project.
