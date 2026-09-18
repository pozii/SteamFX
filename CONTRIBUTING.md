# Contributing

Bug reports and pull requests are both welcome.

## Reporting a bug

Open an issue and tell us what you expected and what happened instead. A few things help a lot:

- The Steam page URL, or a screenshot, if a price was missed or converted wrongly.
- Your browser and version.
- Your Steam store region.

## Working on the extension

There's no build step; it's plain JavaScript.

1. Fork and clone the repo.
2. Load [`extension/`](extension) as an unpacked extension (see [extension/README.md](extension/README.md)).
3. Make your change, reload the extension, refresh a Steam tab and check that it works.

A few ground rules:

- Try not to add dependencies. If you really need one, explain why in the PR.
- Follow the style of the code around your change.
- The extension only talks to the exchange-rate API, and the [privacy policy](PRIVACY_POLICY.md) says so. Please open an issue before adding any other network request.
- Keep each PR to one change.

## Working on the desktop app

It's an Electron app in [`desktop/`](desktop). See [desktop/README.md](desktop/README.md) for how it works and how to run it from source.

```
cd desktop
npm install
npm test
npm start
```

A few things to keep in mind:

- The price parsing, currency data, defaults and popup UI are shared with the extension and copied in by `npm start`. Change them in `extension/`, not in `desktop/src/vendor/`.
- [`desktop/src/injected/core.js`](desktop/src/injected/core.js) mirrors [`extension/content.js`](extension/content.js). If you change how prices are found or converted, change both.
- Uninstalling has to leave nothing behind. If your change makes the app create a file, folder or registry entry, add its removal to [`desktop/build/installer.nsh`](desktop/build/installer.nsh) and check with a real install and uninstall.

## Releasing (maintainers)

Releases are automatic, and the extension and the desktop app share one version number. Bump `version` in [`extension/manifest.json`](extension/manifest.json) and push to `main`. The [release workflow](.github/workflows/release.yml) then runs the desktop tests, builds the Windows installer, zips the extension, tags `v<version>` and publishes a single GitHub release with generated notes and these files:

- `steam-fx-extension-v<version>.zip`
- `SteamFX-Setup-<version>.exe`
- `latest.yml`, which the desktop app's updater reads

If that version already has a release, nothing happens. Both parts stay in the same release on purpose: the updater looks at the latest release, so it has to find the installer there every time. `desktop/package.json` keeps a placeholder version; the real one is taken from the manifest at build time.
