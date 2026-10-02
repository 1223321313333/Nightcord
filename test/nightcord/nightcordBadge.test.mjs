/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// NightcordBadge must read the public badge file correctly: valid ids only, dev flag, and default tooltips.
// It also checks the committed badges.json so a broken hand edit is caught before it ships.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";

import { load, ROOT } from "./helpers.mjs";

let parseBadges;
before(async () => ({ parseBadges } = await load("src/nightcordplugins/nightcordBadge/index.ts")));

describe("NightcordBadge", () => {
    it("accepts a plain id string with the default tooltip", () => {
        const m = parseBadges({ users: ["556674373684297738"] });
        assert.deepEqual(m.get("556674373684297738"), { tooltip: "Nightcord", dev: false });
    });

    it("gives dev entries the creator tooltip by default and keeps a custom one", () => {
        const m = parseBadges({ users: [
            { id: "111111111111111111", dev: true },
            { id: "222222222222222222", dev: true, tooltip: "Создатель Nightcord" },
            { id: "333333333333333333", tooltip: "Тестер" }
        ] });
        assert.deepEqual(m.get("111111111111111111"), { tooltip: "Создатель Nightcord", dev: true });
        assert.deepEqual(m.get("222222222222222222"), { tooltip: "Создатель Nightcord", dev: true });
        assert.deepEqual(m.get("333333333333333333"), { tooltip: "Тестер", dev: false });
    });

    it("drops entries without a valid snowflake id", () => {
        const m = parseBadges({ users: ["not-an-id", { id: "123" }, { tooltip: "x" }, "556674373684297738"] });
        assert.equal(m.size, 1);
        assert.ok(m.has("556674373684297738"));
    });

    it("handles an empty or missing file", () => {
        assert.equal(parseBadges(undefined).size, 0);
        assert.equal(parseBadges({ users: [] }).size, 0);
    });

    it("the committed badges.json is valid and parses", () => {
        const file = JSON.parse(readFileSync(join(ROOT, "badges.json"), "utf8"));
        const m = parseBadges(file);
        // every listed user must have produced a holder (no silently-dropped malformed ids)
        assert.equal(m.size, file.users.length);
    });
});
