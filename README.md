# Nightcord

Nightcord is a Discord client mod. It is a fork of [Vencord](https://github.com/Vendicated/Vencord) by Vendicated and contributors, licensed under GPL-3.0-or-later.

## Build

```sh
pnpm install
pnpm build
pnpm inject
```

`pnpm inject` uses the Vencord installer to point Discord at this build's `dist` folder. `pnpm uninject` removes it.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE). Source-file headers keep the original Vencord copyright notices, as the licence requires.
