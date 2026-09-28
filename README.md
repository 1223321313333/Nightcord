# Nightcord

Website: https://1223321313333.github.io/Nightcord/

Nightcord is a Discord client mod built on [Equicord](https://github.com/Equicord/Equicord), itself a fork of [Vencord](https://github.com/Vendicated/Vencord) by Vendicated and contributors. It ships almost 400 plugins, including its own in `src/nightcordplugins`. Licensed under GPL-3.0-or-later.

## Install (Windows)

1. Download [NightcordInstaller.zip](https://github.com/1223321313333/Nightcord/releases/download/devbuild/NightcordInstaller.zip) and unzip it.
2. Double-click `NightcordInstaller.bat` and choose **1**.

The installer downloads `desktop.asar` from this repository's `devbuild` release and injects it into Discord, Discord PTB and Discord Canary. Choose **2** to remove it and restore the original Discord.

## Build from source

```sh
pnpm install
pnpm build
pnpm inject
```

On Windows, `pnpm inject` / `pnpm uninject` use Nightcord's own installer with your local `dist` folder. Every push to `main` is built by GitHub Actions and published to the `devbuild` release.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE). Source-file headers keep the original Vencord and Equicord copyright notices, as the licence requires.
