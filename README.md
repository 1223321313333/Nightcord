# Nightcord

Website: https://1223321313333.github.io/Nightcord/

Nightcord is a Discord client mod built on [Equicord](https://github.com/Equicord/Equicord), itself a fork of [Vencord](https://github.com/Vendicated/Vencord) by Vendicated and contributors. It ships almost 400 plugins, including its own in `src/nightcordplugins`. Licensed under GPL-3.0-or-later.

## Install (Windows)

1. Download [NightcordInstaller.exe](https://github.com/1223321313333/Nightcord/releases/latest/download/NightcordInstaller.exe).
2. Run it and click **Установить** (Install). No administrator rights are needed.

The installer (`installer/NightcordInstaller.cs`, a small .NET Framework app built by GitHub Actions) finds Discord, Discord PTB and Discord Canary, downloads `desktop.asar` from this repository's `stable` release, checks its SHA-256 against the digest GitHub reports for that file and only then injects it. **Удалить Nightcord** restores the original Discord. Windows SmartScreen may warn because the installer is not code-signed: choose *More info → Run anyway*. Every build is signed with GitHub build provenance (Sigstore); check a download with `gh attestation verify NightcordInstaller.exe --repo 1223321313333/Nightcord`. The built-in updater checks it before installing an update.

Without a window: `NightcordInstaller.exe --install` or `--uninstall`. The PowerShell installer (`NightcordInstaller.zip` in the same release) does the same from a console.

## Build from source

```sh
pnpm install
pnpm build
pnpm inject
```

**Nightcord Desktop** (beta, `desktop/`): a Windows app with Nightcord built in, made from Equibop, from the [`desktop` release](https://github.com/1223321313333/Nightcord/releases/tag/desktop). See `desktop/NIGHTCORD.md`.

On Windows, `pnpm inject` / `pnpm uninject` use Nightcord's own installer with your local `dist` folder. Every push to `main` is built by GitHub Actions and published to the `devbuild` release (beta). Once a day a build that is at least 20 hours old and passed CI is copied to the `stable` release, which is what the installer and the updater use unless *Beta versions* is on.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE). Source-file headers keep the original Vencord and Equicord copyright notices, as the licence requires.
