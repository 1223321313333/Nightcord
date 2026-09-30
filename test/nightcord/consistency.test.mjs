/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Catches what a sync with Equicord can silently break: plugin names that Nightcord's lists refer to,
// and generated translation tables that were not regenerated

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, describe, it } from "node:test";

import { load, ROOT } from "./helpers.mjs";

/** Every plugin name defined in the source, found by reading definePlugin({ name: "..." }) */
function pluginNames() {
    const names = new Set();
    const dirs = ["src/plugins", "src/plugins/_api", "src/plugins/_core", "src/equicordplugins", "src/equicordplugins/_api", "src/equicordplugins/_core", "src/nightcordplugins"];
    for (const dir of dirs) {
        for (const entry of readdirSync(join(ROOT, dir))) {
            const full = join(ROOT, dir, entry);
            const files = statSync(full).isDirectory()
                ? ["index.ts", "index.tsx"].map(f => join(full, f)).filter(existsSync)
                : /\.tsx?$/.test(entry) ? [full] : [];
            for (const file of files) {
                const m = readFileSync(file, "utf8").match(/definePlugin\(\{[\s\S]{0,300}?\bname:\s*"([^"]+)"/);
                if (m) names.add(m[1]);
            }
        }
    }
    return names;
}

const quoted = text => [...text.matchAll(/"([A-Za-z0-9]+)"/g)].map(m => m[1]);

describe("plugin names Nightcord refers to exist", () => {
    let names, curation;
    before(async () => {
        names = pluginNames();
        curation = await load("src/components/settings/tabs/plugins/curation.ts");
    });

    it("finds the plugins at all", () => assert.ok(names.size > 300, `only ${names.size} plugins found`));

    const check = (label, list) => {
        const missing = [...list].filter(n => !names.has(n));
        assert.deepEqual(missing, [], `${label} names plugins that do not exist (renamed or removed upstream?)`);
    };

    it("curated, developer and data lists", () => {
        check("CURATED_EQUICORD", curation.CURATED_EQUICORD);
        check("DEV_TOOLS", curation.DEV_TOOLS);
        check("SENDS_DATA", Object.keys(curation.SENDS_DATA));
        check("VISIBLE_TO_OTHERS", Object.keys(curation.VISIBLE_TO_OTHERS));
    });

    it("plugin presets", () => {
        const source = readFileSync(join(ROOT, "src/components/settings/tabs/nightcord/PluginPresets.tsx"), "utf8");
        const heavy = source.match(/const HEAVY_PLUGINS = \[([\s\S]*?)\];/)[1];
        const enables = [...source.matchAll(/enable: \(\) => \[([\s\S]*?)\]/g)].map(m => m[1]).join(",");
        const settings = [...source.matchAll(/^\s{12}([A-Za-z0-9]+): \{/gm)].map(m => m[1]);
        check("HEAVY_PLUGINS", quoted(heavy));
        check("preset enable lists", quoted(enables));
        check("preset settings", settings);
    });

    it("translation data", () => {
        for (const file of ["plugin-settings.ru.json", "plugin-descriptions.ru.json"]) {
            const data = JSON.parse(readFileSync(join(ROOT, "scripts/nightcord/data", file), "utf8"));
            check(file, Object.keys(data));
        }
    });
});

const out = mkdtempSync(join(tmpdir(), "nightcord-gen-"));
const normalize = text => text.replace(/\r\n/g, "\n");

describe("translations", () => {
    it("pluginSettingsRu.ts matches its data file", () => {
        const target = join(out, "pluginSettingsRu.ts");
        execFileSync(process.execPath, [join(ROOT, "scripts/nightcord/genSettings.cjs")], { env: { ...process.env, NIGHTCORD_GEN_OUT: target } });
        assert.ok(
            normalize(readFileSync(target, "utf8")) === normalize(readFileSync(join(ROOT, "src/utils/pluginSettingsRu.ts"), "utf8")),
            "src/utils/pluginSettingsRu.ts is out of date: run node scripts/nightcord/genSettings.cjs"
        );
    });

    // A translation is only shown while the English description it was made from is unchanged. When Equicord
    // rewrites a description, its Russian text needs a look: listed here, without failing the run.
    it("reports plugin descriptions whose English text changed", t => {
        const pluginsJson = join(out, "plugins.json");
        execFileSync(process.execPath, [join(ROOT, "node_modules/tsx/dist/cli.mjs"), join(ROOT, "scripts/generatePluginList.ts"), pluginsJson], { cwd: ROOT });
        const plugins = JSON.parse(readFileSync(pluginsJson, "utf8"));
        const committed = readFileSync(join(ROOT, "src/utils/pluginDescriptionsRu.ts"), "utf8");
        const hashes = Object.fromEntries([...committed.matchAll(/^\s+"([^"]+)": \["([a-z0-9]+)",/gm)].map(m => [m[1], m[2]]));
        const fnv1a = str => {
            let h = 0x811c9dc5;
            for (let i = 0; i < str.length; i++) {
                h ^= str.charCodeAt(i);
                h = Math.imul(h, 0x01000193);
            }
            return (h >>> 0).toString(36);
        };
        const stale = plugins.filter(p => hashes[p.name] && hashes[p.name] !== fnv1a(p.description)).map(p => p.name);
        assert.ok(Object.keys(hashes).length > 100, "could not read the description table");
        t.diagnostic(stale.length
            ? `${stale.length} Russian descriptions are hidden because the English text changed: ${stale.join(", ")}`
            : "all Russian descriptions are current");
    });
});
