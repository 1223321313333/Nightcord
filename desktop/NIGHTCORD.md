# Nightcord Desktop

A Windows and Linux app with Nightcord built in, made from [Equibop](https://github.com/Equicord/Equibop) (itself a Vesktop fork).
Unlike the official Discord app with Nightcord injected, it does not run Discord's native modules (process scanning for
game detection, the crash reporter, the host updater), and Discord updates cannot break the injection.

- Based on Equibop `83b88c5` (2026-09-16).
- `nightcord-rebrand.mjs` turns Equibop into Nightcord Desktop: the `Nightcord` global instead of `Vencord`, names and
  links, the app id, the Windows installer and its update feed. It only touches what is still Equibop's, so it is safe
  to run again.
- `src/main/utils/vencordLoader.ts` downloads `equibop.asar` from Nightcord's stable release and checks it against the
  `equibop.asar.sha256` published next to it. After that, Nightcord inside the app updates itself like the injected
  one: stable or beta channel, sha256 and signed build provenance.
- `.github/workflows/desktop.yml` builds on every change under `desktop/` and publishes to the `desktop` release:
  the Windows installer (`NightcordDesktopSetup.exe` + `latest.yml`) and the Linux AppImage and `.deb`
  (`NightcordDesktop.AppImage` + `latest-linux.yml`). The app updates from those. No macOS build: it needs a paid
  Apple signing/notarization certificate.

## Updating from Equibop

```bash
git clone --depth 1 https://github.com/Equicord/Equibop /tmp/equibop
rsync -a --delete --exclude node_modules --exclude dist --exclude NIGHTCORD.md --exclude nightcord-rebrand.mjs \
    --exclude .github /tmp/equibop/ desktop/
cd desktop && node nightcord-rebrand.mjs
```

Then restore Nightcord's own changes that are not in the script (`git diff` shows them: the loader in
`src/main/utils/vencordLoader.ts`, the icons in `build/` and `static/`), run `bun install`, `bunx tsc --noEmit`,
`bunx eslint src` and `bun run build`, and note the new Equibop commit above.
