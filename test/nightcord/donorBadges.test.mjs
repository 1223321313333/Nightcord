/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The donor badge lists come from Vencord's and Equicord's servers, which see the user's IP address on every
// download. Nightcord only downloads them while the user has donor badges turned on; these tests lock that, and
// that one blocked host neither takes the other list down nor rejects into the plugin's start or its interval.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { load, ROOT } from "./helpers.mjs";

const VENCORD = "https://badges.vencord.dev/badges.json";
const EQUICORD = "https://badge.equicord.org/badges.json";
const vencordList = { 1: [{ tooltip: "Vencord Donor", badge: "v.png" }] };
const equicordList = { 2: [{ tooltip: "Equicord Donor", badge: "e.png" }] };

const stubs = {
    "@utils/types": "export const OptionType = { BOOLEAN: 'BOOLEAN' };",
    "@utils/Logger": "export class Logger { warn(msg) { globalThis.__donorWarnings.push(msg); } }"
};

const flush = () => new Promise(r => setTimeout(r, 0));

/** A fresh module, a fake download that answers from `responses` (an Error rejects) and a record of what it applied */
async function setup(responses = { [VENCORD]: vencordList, [EQUICORD]: equicordList }) {
    globalThis.__donorWarnings = [];
    const mod = await load("src/plugins/_api/badges/donorBadges.ts", stubs);
    const requests = [];
    const applied = [];
    const download = async (url, noCache) => {
        requests.push([url, noCache]);
        const response = await responses[url];
        if (response instanceof Error) throw response;
        return response;
    };
    return {
        ...mod,
        requests,
        applied,
        store: mod.donorBadgeSettings.store,
        changed: () => mod.donorBadgeSettings.def.donorBadges.onChange(),
        loadLists: noCache => mod.loadDonorBadges(download, (v, e) => applied.push([v, e]), noCache)
    };
}

describe("donor badges", () => {
    it("are off by default, and then nothing is downloaded", async () => {
        const s = await setup();
        assert.equal(s.store.donorBadges, false);
        await s.loadLists();
        assert.deepEqual(s.requests, []);
        assert.deepEqual(s.applied, [[{}, {}]]);
    });

    it("download both lists when turned on", async () => {
        const s = await setup();
        s.store.donorBadges = true;
        await s.loadLists();
        assert.deepEqual(s.requests, [[VENCORD, false], [EQUICORD, false]]);
        assert.deepEqual(s.applied, [[vencordList, equicordList]]);
    });

    it("pass noCache on for a refetch", async () => {
        const s = await setup();
        s.store.donorBadges = true;
        await s.loadLists(true);
        assert.deepEqual(s.requests, [[VENCORD, true], [EQUICORD, true]]);
    });

    it("still load one list when the other host fails, and name the failed one", async () => {
        const s = await setup({ [VENCORD]: new Error("blocked"), [EQUICORD]: equicordList });
        s.store.donorBadges = true;
        await s.loadLists();
        assert.deepEqual(s.applied, [[undefined, equicordList]], "undefined tells the caller to keep its previous list");
        assert.deepEqual(globalThis.__donorWarnings, ["Could not load Vencord donor badges (network or host unavailable)"]);
    });

    it("do not reject when both hosts fail", async () => {
        const s = await setup({ [VENCORD]: new Error("down"), [EQUICORD]: new Error("down") });
        s.store.donorBadges = true;
        await s.loadLists();
        assert.deepEqual(s.applied, [[undefined, undefined]]);
        assert.deepEqual(globalThis.__donorWarnings, ["Could not load Vencord and Equicord donor badges (network or host unavailable)"]);
    });

    it("drop lists that arrive after being turned off", async () => {
        let arrive;
        const late = new Promise(r => arrive = r);
        const s = await setup({ [VENCORD]: late.then(() => vencordList), [EQUICORD]: late.then(() => equicordList) });
        s.store.donorBadges = true;
        const loading = s.loadLists();
        s.store.donorBadges = false;
        arrive();
        await loading;
        assert.deepEqual(s.applied, [[{}, {}]]);
    });

    it("reload at once when the setting changes, without a request when turned off", async () => {
        const s = await setup();
        s.changed(); // before the first load there is nothing to reload yet
        await s.loadLists();
        assert.deepEqual(s.requests, []);

        s.store.donorBadges = true;
        s.changed();
        await flush();
        assert.deepEqual(s.requests, [[VENCORD, false], [EQUICORD, false]]);
        assert.deepEqual(s.applied.at(-1), [vencordList, equicordList]);

        s.store.donorBadges = false;
        s.changed();
        await flush();
        assert.equal(s.requests.length, 2, "turning it off must not download anything");
        assert.deepEqual(s.applied.at(-1), [{}, {}]);
    });

    it("explain the privacy cost, with the exact English text the Russian translation was made from", async () => {
        const { donorBadgeSettings } = await setup();
        const { description } = donorBadgeSettings.def.donorBadges;
        assert.match(description, /badges\.vencord\.dev/);
        assert.match(description, /badge\.equicord\.org/);
        assert.match(description, /IP address/);
        const translations = JSON.parse(readFileSync(join(ROOT, "scripts/nightcord/data/plugin-settings.ru.json"), "utf8"));
        assert.equal(description, translations.BadgeAPI.donorBadges[0], "a changed description hides its Russian translation");
    });
});
