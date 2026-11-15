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
- `bun.lock` is kept up to date by `.github/workflows/update-deps.yml`: once a week it moves to the newest versions
  `package.json` allows. A new build goes out when that changes the app's code or Electron; a change that only touches
  build tools waits for the next build.
- The app draws its screen share picker and its settings with components it takes from the client at run time: an
  import from `@equicord/types/*` becomes `Nightcord.Components`, `Nightcord.Webpack.Common` and so on
  (`scripts/build/vencordDep.mts`). The app's type check runs against the published `@equicord/types`, not against
  the client the app will load, so `test/nightcord/desktopClientApi.test.mjs` compares the two: it fails when the
  client stops exporting something the app imports. Then move the app off it and release the app before that client
  reaches stable, since an installed app only updates when it is started.
- `src/renderer/components/Heading.tsx` is Nightcord's: the client's old `Heading` and `HeadingTertiary`, which the
  client is dropping, rebuilt from its `Text`. Equibop after `83b88c5` uses the client's new `Heading` instead, which
  only a client synced past Equicord `32fb6242a` exports.

## Updating from Equibop

```bash
git clone --depth 1 https://github.com/Equicord/Equibop /tmp/equibop
rsync -a --delete --exclude node_modules --exclude dist --exclude NIGHTCORD.md --exclude nightcord-rebrand.mjs \
    --exclude .github /tmp/equibop/ desktop/
cd desktop && node nightcord-rebrand.mjs
```

Then restore Nightcord's own changes that are not in the script (`git diff` shows them: the loader in
`src/main/utils/vencordLoader.ts`, the icons in `build/` and `static/`, `bun.lock` in `.gitignore`), run `bun install`, `bunx tsc --noEmit`,
`bunx eslint src`, `bun run build` and, from the repository root, `node --test test/nightcord/desktopClientApi.test.mjs`,
and note the new Equibop commit above. Equibop is written for the newest Equicord: if that test fails, Nightcord's
client is behind it, so sync the client first.
