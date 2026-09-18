# Steam FX desktop app

A Windows tray app that converts prices inside the Steam app itself, the same way the browser extension does on the website. You change the currency and other settings from the tray icon.

## How it works

Steam's built-in browser can open a local debugging port. As soon as Steam FX finds your Steam install, it puts an empty file called `.cef-enable-remote-debugging` in your Steam folder. There's no switch for this, because converting prices in the Steam app is what the app is for. After one Steam restart, Steam listens on `127.0.0.1:8080`. Steam FX connects to that port, finds the open store pages and runs the same conversion code as the extension.

Nothing in Steam is patched. The only thing Steam FX adds to your Steam folder is that one empty file, and the uninstaller removes it again. If the file was already there before Steam FX (some other tool put it there), Steam FX leaves it alone. The on/off switch in the window stops the conversion but doesn't remove the file; uninstalling does.

This uses a debugging feature Steam ships for developers. It's not an official Valve feature for this, so keep that in mind.

## Install

1. Download `SteamFX-Setup-<version>.exe` from [the latest release](https://github.com/pozii/SteamFX/releases/latest).
2. Run it. It installs for your user only, so there's no admin prompt.
3. Windows may show a SmartScreen warning because the installer isn't code-signed yet. Choose **More info**, then **Run anyway**.

New tray icons often start out hidden on Windows 11. If you can't see it, click the `^` arrow next to the clock, or turn it on under Settings, Personalization, Taskbar, Other system tray icons.

## Updates

The app checks the latest GitHub release shortly after it starts and every 6 hours after that. A newer version downloads in the background (its checksum is verified) and installs when you quit Steam FX, or straight away with **Restart to update** in the tray menu or the settings screen. Your settings are kept. Turn **Update automatically** off in the settings screen if you'd rather check by hand.

Updates only run in the installed app, not when you run it from source.

## Uninstall

Remove **SteamFX** from Windows Settings, Apps. The uninstaller cleans up after itself:

- the install folder and Start menu shortcut
- the "launch at startup" entry
- the flag file in your Steam folder, if Steam FX created it
- the settings folder in `%APPDATA%\SteamFX`
- the installer's update cache, including any downloaded update
- the entries Windows keeps for the tray icon and for launching the app

Windows itself also keeps a short install and uninstall history of apps for its backup feature. That's outside what an uninstaller controls, so it stays.

Upgrading to a newer version keeps your settings. Only a real uninstall wipes them.

## Run from source

```
cd desktop
npm install
npm start
```

`npm test` runs the unit tests and `npm run dist` builds the installer into `dist/`. The version comes from [`../extension/manifest.json`](../extension/manifest.json), so the extension and the desktop app share one version number. `npm run dist -- --version=x.y.z --out=somewhere` builds a throwaway version, handy for trying the updater.

While developing you can point the app at throwaway folders so it doesn't touch your real data or Steam install:

```
$env:STEAMFX_DATA_DIR = "C:\temp\steamfx-data"
$env:STEAMFX_STEAM_DIR = "C:\temp\fake-steam"
npm start
```

A custom `STEAMFX_DATA_DIR` also stops the app from touching the "launch at startup" registry entry of an installed copy.

`STEAMFX_CDP_PORT` changes the debugging port it connects to (default `8080`).

To try an update without publishing a release, serve a folder holding an installer and its `latest.yml` (from a `--version` build) and start the installed or unpacked app with `STEAMFX_UPDATE_URL=http://127.0.0.1:8099`. A test feed never installs on quit; only **Restart to update** does.

## What's where

```
src/main.js            App entry: tray, window, and wiring everything together
src/injector.js        Talks to Steam's debugging port
src/injected/core.js   Code that runs inside Steam's store pages
src/injection.js       Bundles core.js with the shared helpers
src/steam.js           Finds Steam, manages the flag file, restarts Steam
src/autostart.js       "Launch at startup"
src/updater.js         Update checks and downloads (electron-updater)
src/store.js           Settings file
src/rates.js           Exchange rates
src/renderer/          The settings window
build/installer.nsh    Extra uninstall steps
scripts/               Copies the shared files out of extension/, and builds the installer
```

The price parsing, currency names, defaults and the popup UI all come from [`../extension`](../extension). `npm start` and `npm run dist` copy them into `src/vendor/` (git-ignored), so there's only one copy to maintain.

The exception is `src/injected/core.js`. It mirrors [`extension/content.js`](../extension/content.js), so a change to how prices are found or converted needs to go in both.

## Notes

- Windows only for now.
- Its settings are separate from the browser extension's. Set the currency in each.
- Data lives in `%APPDATA%\SteamFX`, including a small log (`steamfx.log`) that's handy when something isn't converting.
