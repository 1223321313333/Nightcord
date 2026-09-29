/*
 * Nightcord upstream rebrand script.
 *
 * Turns a checkout of Equicord into "Equicord with the Nightcord name", so upstream changes can be
 * merged into Nightcord as ordinary diffs (see .github/workflows/sync-equicord.yml).
 *
 * Usage: node scripts/nightcord/rebrand.cjs <path to an Equicord git checkout>
 *
 * The product name becomes Nightcord. Things that are about Vencord or Equicord themselves stay as
 * they are: plugin origin labels, donor/contributor badges, external URLs and services, installer
 * contracts, protocol schemes, CLI flags and licence headers.
 */
// @ts-check
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = process.argv[2];
if (!ROOT) throw new Error("Usage: node scripts/nightcord/rebrand.cjs <equicord checkout>");
process.chdir(ROOT);

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

const files = git("ls-files", "src", "scripts", "browser", "packages", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "tsconfig.json", "eslint.config.mjs")
    .split("\n").filter(Boolean)
    .filter(f => !/header-(new|old)\.txt$/.test(f))
    .filter(f => !/\.(png|jpe?g|gif|webp|ico|woff2?|avif|mp3|ogg|wav)$/i.test(f));

const BRAND = /\b[A-Za-z0-9_$]*(?:Vencord|vencord|VENCORD|Equicord|equicord|EQUICORD)[A-Za-z0-9_$]*\b/g;
const rename = s => s
    .replace(/Vencord/g, "Nightcord").replace(/vencord/g, "nightcord").replace(/VENCORD/g, "NIGHTCORD")
    .replace(/Equicord/g, "Nightcord").replace(/equicord/g, "nightcord").replace(/EQUICORD/g, "NIGHTCORD");
const isV = t => /vencord/i.test(t), isE = t => /equicord/i.test(t);

// Identifiers that exist in both brands (VencordDonor / EquicordDonor, isVencordPlugin / isEquicordPlugin, ...)
// describe the two projects themselves. Renaming both to Nightcord would make them collide, so keep them.
const vTokens = new Set(), eTokens = new Set();
for (const f of files) {
    for (const t of fs.readFileSync(f, "utf8").match(BRAND) ?? []) {
        if (isV(t) && !isE(t)) vTokens.add(t);
        else if (isE(t) && !isV(t)) eTokens.add(t);
    }
}
const vMapped = new Map([...vTokens].map(t => [rename(t), t]));
const bare = new Set(["Vencord", "vencord", "VENCORD", "Equicord", "equicord", "EQUICORD"]);
const protectTokens = new Set(["equicordplugins"]);
for (const t of eTokens) {
    const m = rename(t);
    if (vMapped.has(m) && !bare.has(t)) {
        protectTokens.add(t);
        protectTokens.add(vMapped.get(m));
    }
}

const PROTECT = [
    /^\s*\*?\s*Vencord, a (?:Discord client mod|modification for Discord's desktop app)/gm, // licence headers
    /https?:\/\/[^\s"'`)<>\]]+/g,                                     // URLs
    /[\w.-]*(?:vencord\.dev|equicord\.org)[\w./-]*/g,                 // bare domains
    /\b(?:Vendicated|Vencord|Equicord)\/[A-Z][\w.-]*/g,               // GitHub org/repo slugs
    /\b(?:VencordInstallerCli|EquilotlCli)[\w.-]*/g,                  // installer binaries
    /\b(?:VENCORD|EQUICORD)_(?:USER_DATA_DIR|DEV_INSTALL|DIRECTORY)\b/g, // installer env contract
    /\b(?:vencord|equicord):\/\//g,                                   // protocol schemes
    /(["'`])(?:--)?(?:vencord|equicord):?\1/g,                        // exact lowercase ids, CLI flags, CSP schemes
    /^(\s*)(?:vencord|equicord)(?=:\s)/gm,                            // object keys like `vencord: devs`
    /\bSearchStatus\.(?:VENCORD|EQUICORD)\b/g,
    /^(\s+)(?:VENCORD|EQUICORD),$/gm,                                 // SearchStatus enum members
    // origin labels and anything about the projects themselves
    /Modified Vencord Plugin|(?:Vencord|Equicord) Plugin\b|Show (?:Vencord|Equicord)\b/g,
    /\balt[:=] ?"(?:Vencord|Equicord)"/g,
    /(?:Vencord|Equicord) (?:[Dd]onors?|[Cc]ontributors?|users|Server|Support|Translator|Cloud)\b/g,
    /\((?:Not|not) (?:Vencord|Equicord)\)/g,
    /\b(?:Vencord|Equicord)['’]s\b/g,
    /src\/equicordplugins/g,
];

let changed = 0;
for (const f of files) {
    const orig = fs.readFileSync(f, "utf8");
    const stash = [];
    const hide = s => { stash.push(s); return `\u0000${stash.length - 1}\u0000`; };

    let s = orig;
    for (const re of PROTECT) s = s.replace(re, m => /vencord|equicord|Vendicated/i.test(m) ? hide(m) : m);
    s = s.replace(BRAND, t => protectTokens.has(t) ? hide(t) : t);
    s = s.replace(BRAND, t => rename(t));
    // "an Equicord update" -> "a Nightcord update"
    s = s.replace(/\b([Aa])n Nightcord\b/g, "$1 Nightcord");
    for (let i = 0; i < 3; i++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => stash[+n]);

    if (s !== orig) {
        fs.writeFileSync(f, s);
        changed++;
    }
}

// Rename files and folders the same way, deepest first
const renamePath = p => p.split("/").map(seg => seg.replace(BRAND, t => protectTokens.has(t) ? t : rename(t))).join("/");
const allPaths = new Set();
for (const f of files) {
    const parts = f.split("/");
    for (let i = 1; i <= parts.length; i++) allPaths.add(parts.slice(0, i).join("/"));
}
const toRename = [...allPaths]
    .filter(p => path.basename(p) !== path.basename(renamePath(p)))
    .sort((a, b) => b.split("/").length - a.split("/").length);
for (const p of toRename) {
    if (!fs.existsSync(p)) continue;
    git("mv", p, path.posix.join(path.posix.dirname(p), path.posix.basename(renamePath(p))));
}

console.log(`rebranded ${changed} files, renamed ${toRename.length} paths, kept ${protectTokens.size} origin identifiers`);
