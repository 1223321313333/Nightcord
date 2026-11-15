/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord Desktop draws its screen share picker and its settings with components it takes from the client at
// run time (Nightcord.Components, Nightcord.Webpack.Common, ...). Its own type check runs against a published
// types package, not against this client, so a sync with Equicord that renames or drops one of them passes every
// other check and leaves the app with `undefined` where a component was: Toasts went that way in October 2026.
// This compares what the app's renderer really imports with what the client really exports.

import assert from "node:assert/strict";
import { join } from "node:path";
import { before, describe, it } from "node:test";

import { build } from "esbuild";

import { ROOT } from "./helpers.mjs";

// Where desktop/scripts/build/vencordDep.mts points each import of the app: the client's module behind it
const CLIENT_MODULES = {
    "components": "src/components/index.ts",
    "webpack": "src/webpack/index.ts",
    "webpack/common": "src/webpack/common/index.ts",
    "utils": "src/utils/index.ts",
    "api/Styles": "src/api/Styles.ts",
    "api/ContextMenu": "src/api/ContextMenu.ts"
};

const common = {
    bundle: true,
    write: false,
    format: "esm",
    logLevel: "silent",
    loader: { ".css": "empty", ".svg": "empty", ".png": "empty" },
    // npm packages, and what only the real build can provide (generated modules, files with a ?query)
    packages: "external",
    plugins: [{
        name: "leave-out",
        setup(b) {
            b.onResolve({ filter: /^(~|file:)|\?/ }, args => ({ path: args.path, external: true }));
        }
    }]
};

/** Every name the app's renderer imports from the client as a value, by import path */
async function importedByDesktop() {
    const result = await build({
        ...common,
        absWorkingDir: join(ROOT, "desktop"),
        entryPoints: ["src/renderer/index.ts"],
        external: ["@equicord/types/*"],
        jsx: "preserve"
    });

    /** @type {Record<string, Set<string>>} */
    const imports = {};
    const code = result.outputFiles[0].text;
    assert.doesNotMatch(code, /import \* as \w+ from "@equicord\/types\//, "a namespace import from the client: this test cannot tell which names it uses");
    for (const [, names, path] of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@equicord\/types\/([^"]+)"/g)) {
        const set = imports[path] ??= new Set();
        for (const name of names.split(",")) {
            const original = name.trim().split(/\s+as\s+/)[0];
            if (original) set.add(original);
        }
    }
    return imports;
}

/** The names each of the client's modules exports */
async function exportedByClient() {
    const result = await build({
        ...common,
        absWorkingDir: ROOT,
        entryPoints: Object.fromEntries(Object.entries(CLIENT_MODULES).map(([path, file]) => [path.replace("/", "_"), file])),
        outdir: "out",
        metafile: true,
        define: Object.fromEntries(["IS_DEV", "IS_WEB", "IS_DISCORD_DESKTOP", "IS_VESKTOP", "IS_EQUIBOP", "IS_REPORTER", "IS_STANDALONE", "IS_EXTENSION", "IS_USERSCRIPT"].map(name => [name, "false"]))
    });

    /** @type {Record<string, Set<string>>} */
    const exports = {};
    for (const path of Object.keys(CLIENT_MODULES)) {
        exports[path] = new Set(result.metafile.outputs[`out/${path.replace("/", "_")}.js`].exports);
    }
    return exports;
}

describe("what Nightcord Desktop takes from the client", () => {
    let imports, exports;
    before(async () => {
        [imports, exports] = await Promise.all([importedByDesktop(), exportedByClient()]);
    });

    it("is found by this test at all", () => {
        assert.ok(imports.components?.has("Text"), "the app's imports were not read: it does import Text");
        assert.ok(exports.components.has("Text") && exports["webpack/common"].has("showToast"), "the client's exports were not read");
    });

    it("comes only from modules this test knows", () => {
        const unknown = Object.keys(imports).filter(path => !(path in CLIENT_MODULES));
        assert.deepEqual(unknown, [], "add them to CLIENT_MODULES, as desktop/scripts/build/vencordDep.mts maps them");
    });

    it("is still exported by the client", () => {
        const missing = Object.entries(imports).flatMap(([path, names]) => [...names].filter(name => !exports[path]?.has(name)).map(name => `${name} from ${path}`));
        assert.deepEqual(missing, [], "the app would get undefined for these. Move the app off them (desktop/src/renderer) and release it before this client reaches stable");
    });
});
