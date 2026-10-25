/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord's own plugins are built-in features the user cannot turn off: every plugin in nightcordplugins
// must declare `nightcordLocked: true`. This guards against a new plugin (or a future change) leaving one
// toggleable by accident.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { ROOT } from "./helpers.mjs";

const base = join(ROOT, "src/nightcordplugins");
const dirs = readdirSync(base).filter(d => d !== "_shared" && statSync(join(base, d)).isDirectory());

describe("every Nightcord plugin is locked (cannot be disabled)", () => {
    it("finds the plugins", () => assert.ok(dirs.length >= 20, `only ${dirs.length} plugin folders`));

    for (const d of dirs) {
        it(`${d} declares nightcordLocked`, () => {
            const file = ["index.tsx", "index.ts"].map(f => join(base, d, f)).find(existsSync);
            assert.ok(file, `${d} has no index file`);
            assert.match(readFileSync(file, "utf8"), /\bnightcordLocked:\s*true\b/, `${d} must set nightcordLocked: true`);
        });
    }
});
