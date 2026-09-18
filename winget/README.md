# winget package

The manifests in [`manifest/`](manifest) are for getting Steam FX into the Windows Package Manager, so people can install it with:

```
winget install steamfx
```

The package identifier is `pozii.SteamFX` (winget needs a `Publisher.Package` name, and this one shows who publishes it). The short name `steamfx` comes from the `Moniker` field, so people never have to type the publisher. `winget install SteamFX` works too because it matches the package name.

They describe the current release. They're only needed for the **first** submission; after that the release workflow sends every new version by itself (see below).

## First submission

The repository has to be public first, because winget's checks download the installer from the release URL.

1. Check the manifests: `winget validate --manifest winget/manifest`
2. Copy the three files to `manifests/p/pozii/SteamFX/<version>/` in a fork of [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) and open a pull request. [`wingetcreate`](https://github.com/microsoft/winget-create) can do the fork, the copy and the PR in one go: `wingetcreate submit winget/manifest`.
3. Wait for the checks and a moderator to merge it. The first package usually takes a few days.

If a newer version is out by then, update `PackageVersion`, `InstallerUrl`, `InstallerSha256`, `ReleaseDate` and `ReleaseNotesUrl` first (`wingetcreate update pozii.SteamFX --version <version> --urls <installer url>` does it for you).

## Every release after that

The [release workflow](../.github/workflows/release.yml) has a last step that opens the winget pull request for the new version with [winget-releaser](https://github.com/vedantmgoyal9/winget-releaser). It only runs when a repository secret called `WINGET_TOKEN` exists: a classic GitHub personal access token with the `public_repo` scope, from an account that has forked `microsoft/winget-pkgs`. Without the secret the step is skipped.

The installer is also self-updating, so winget users get new versions either way. The winget entry just keeps `winget upgrade` accurate.
