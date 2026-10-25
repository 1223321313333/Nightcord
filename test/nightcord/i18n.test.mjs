/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord's Russian UI layer. Every helper is a no-op passthrough unless the RussianNightcord plugin is
// enabled; when it is, t() looks strings up, tUpdates() applies Russian plural rules, and tPlugin* fall back
// to English when there is no translation for exactly this text. Tested with the plugin on and off.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const settings = enabled => ({ "@api/Settings": `export const Settings = { plugins: { RussianNightcord: { enabled: ${enabled} } } };` });

let on, off;
before(async () => {
    on = await load("src/utils/i18n.ts", settings(true));
    off = await load("src/utils/i18n.ts", settings(false));
});

describe("i18n passthrough when RussianNightcord is off", () => {
    it("t, tUpdates and tPlugin* return the English input unchanged", () => {
        assert.equal(off.t("Plugins"), "Plugins");
        assert.equal(off.tUpdates(1), "There is 1 Update");
        assert.equal(off.tUpdates(5), "There are 5 Updates");
        assert.equal(off.tPluginDescription({ name: "Whatever", description: "English text" }), "English text");
        const setting = { description: "d", options: [{ label: "A" }] };
        assert.equal(off.tPluginSetting("Whatever", "key", setting), setting);
    });
});

describe("t() when RussianNightcord is on", () => {
    it("translates a known UI string and leaves unknown ones", () => {
        assert.equal(on.t("Plugins"), "Плагины");
        assert.equal(on.t("some string with no translation"), "some string with no translation");
    });
});

describe("tUpdates() Russian plurals", () => {
    const cases = {
        1: "обновление", 2: "обновления", 3: "обновления", 4: "обновления",
        5: "обновлений", 11: "обновлений", 12: "обновлений", 14: "обновлений",
        21: "обновление", 22: "обновления", 25: "обновлений", 101: "обновление", 111: "обновлений"
    };
    for (const [n, word] of Object.entries(cases)) {
        it(`${n} -> ${word}`, () => assert.equal(on.tUpdates(Number(n)), `Доступно ${n} ${word}`));
    }
});

describe("tPluginDescription / tPluginSetting fall back to English", () => {
    it("returns the English description for an unknown plugin even when on", () => {
        assert.equal(on.tPluginDescription({ name: "DefinitelyNotARealPlugin", description: "Hello" }), "Hello");
    });

    it("returns the setting unchanged when there is no translation entry", () => {
        const setting = { description: "d", options: [{ label: "A" }] };
        assert.equal(on.tPluginSetting("DefinitelyNotARealPlugin", "key", setting), setting);
    });
});
