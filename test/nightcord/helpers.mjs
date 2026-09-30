/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Loads real Nightcord source files in Node for tests. Imports of Discord and Nightcord internals (anything
// starting with "@" or "~") are replaced by stubs: either code given by the test, or a generated module whose
// exports are harmless do-nothing values.

import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = mkdtempSync(join(tmpdir(), "nightcord-test-"));

const KNOWN = `
const any = (() => {
    const f = function () { return p; };
    const p = new Proxy(f, { get: (_, k) => k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : p, apply: () => p, construct: () => p });
    return p;
})();
const known = {
    definePluginSettings: def => ({ store: Object.fromEntries(Object.entries(def).map(([k, v]) => [k, v?.default])), def, use: () => ({}) }),
    Logger: class { log() {} info() {} warn() {} error() {} debug() {} }
};
`;

/** Names the importer takes from a module, so the stub can export exactly those */
function importedNames(importerSource, spec) {
    const names = new Set();
    let hasDefault = false;
    const esc = spec.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const re = new RegExp(`import\\s+(?:type\\s+)?([\\w$]+)?\\s*,?\\s*(?:\\{([^}]*)\\})?\\s*from\\s*["']${esc}["']`, "g");
    for (const m of importerSource.matchAll(re)) {
        if (m[1]) hasDefault = true;
        for (const part of (m[2] ?? "").split(",")) {
            const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
            if (name) names.add(name);
        }
    }
    return { names: [...names], hasDefault };
}

/**
 * Bundles `entry` (a path relative to the repo, or { contents, resolveDir }) and imports it.
 * `stubs` maps an import like "@webpack/common" to module source that replaces it.
 */
export async function load(entry, stubs = {}) {
    const input = typeof entry === "string"
        ? { entryPoints: [join(ROOT, entry)] }
        : { stdin: { contents: entry.contents, resolveDir: join(ROOT, entry.resolveDir), loader: "ts" } };

    const result = await build({
        ...input,
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        logLevel: "silent",
        jsx: "transform",
        jsxFactory: "__h",
        jsxFragment: "__Fragment",
        banner: { js: "const __h = (type, props, ...children) => ({ type, props: { ...(props || {}), children } }); const __Fragment = 'Fragment';" },
        define: { IS_DEV: "false", IS_WEB: "false", IS_DISCORD_DESKTOP: "true", IS_VESKTOP: "false", IS_EQUIBOP: "false" },
        plugins: [{
            name: "nightcord-stubs",
            setup(b) {
                b.onResolve({ filter: /^[@~]/ }, args => ({
                    path: args.path,
                    namespace: "stub",
                    pluginData: { importer: args.importer }
                }));
                b.onLoad({ filter: /.*/, namespace: "stub" }, args => {
                    if (args.path in stubs) return { contents: stubs[args.path], loader: "js" };
                    const importer = args.pluginData?.importer;
                    let source = "";
                    try { source = readFileSync(importer, "utf8"); } catch { /* stdin entry */ }
                    const { names } = importedNames(source, args.path);
                    const exports = names.map(n => `export const ${n} = "${n}" in known ? known["${n}"] : any;`).join("\n");
                    return { contents: `${KNOWN}\nexport default (p => p);\n${exports}`, loader: "js" };
                });
            }
        }]
    });

    const file = join(outDir, `bundle-${Math.random().toString(36).slice(2)}.mjs`);
    writeFileSync(file, result.outputFiles[0].text);
    return import(pathToFileURL(file).href);
}

const enc = new TextEncoder();

/** Concatenates strings, byte arrays and Uint8Arrays into one Uint8Array */
export function u8(...parts) {
    const arrays = parts.map(p => typeof p === "string" ? enc.encode(p) : p instanceof Uint8Array ? p : new Uint8Array(p));
    const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
    let offset = 0;
    for (const a of arrays) {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
}

export const be32 = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255];
export const le16 = n => [n & 255, n >> 8 & 255];
export const le32 = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24 & 255];
export const has = (bytes, s) => Buffer.from(bytes).includes(typeof s === "string" ? Buffer.from(s) : Buffer.from(s));
