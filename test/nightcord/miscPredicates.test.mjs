/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord-specific predicates in utils/misc: who gets a contributor badge, and which channels/guild count
// as Nightcord support. Tested against the real constants so a wrong id source or inverted check is caught.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const FAKE_ID = "000000000000000000";
let m, C;
before(async () => {
    m = await load("src/utils/misc.ts");
    C = await load("src/utils/constants.ts");
});

describe("plugin-dev and contributor-badge predicates", () => {
    it("recognises a real Vencord dev id and rejects an unknown one", () => {
        const devId = Object.keys(C.VencordDevsById)[0];
        assert.ok(devId, "there should be at least one Vencord dev");
        assert.equal(m.isPluginDev(devId), true);
        assert.equal(m.isPluginDev(FAKE_ID), false);
        assert.equal(m.isAnyPluginDev(devId), true);
        assert.equal(m.isAnyPluginDev(FAKE_ID), false);
    });

    it("shows the contributor badge unless the dev opted out (badge === false)", () => {
        const devId = Object.keys(C.VencordDevsById)[0];
        assert.equal(m.shouldShowContributorBadge(devId), C.VencordDevsById[devId].badge !== false);
        assert.equal(m.shouldShowContributorBadge(FAKE_ID), false);
    });

    it("recognises a real Nightcord/Equicord dev id", () => {
        const devId = Object.keys(C.EquicordDevsById)[0];
        assert.ok(devId, "there should be at least one Nightcord dev");
        assert.equal(m.isNightcordPluginDev(devId), true);
        assert.equal(m.isNightcordPluginDev(FAKE_ID), false);
        assert.equal(m.shouldShowNightcordContributorBadge(devId), C.EquicordDevsById[devId].badge !== false);
    });
});

describe("support channel / known-issues / guild predicates", () => {
    it("matches the single support channel, and the full list only with includeNightcord", () => {
        assert.equal(m.isSupportChannel(C.SUPPORT_CHANNEL_ID), true);
        assert.equal(m.isSupportChannel("999"), false);
        assert.equal(m.isSupportChannel(null), false);
        for (const id of C.SUPPORT_CHANNEL_IDS) assert.equal(m.isSupportChannel(id, true), true);
    });

    it("matches the known-issues channel the same way", () => {
        assert.equal(m.isKnownIssuesCategory(C.KNOWN_ISSUES_CHANNEL_ID), true);
        assert.equal(m.isKnownIssuesCategory("999"), false);
        for (const id of C.KNOWN_ISSUES_CHANNEL_IDS) assert.equal(m.isKnownIssuesCategory(id, true), true);
    });

    it("recognises the Nightcord guild id and rejects others", () => {
        assert.equal(m.isNightcordGuild(C.GUILD_ID, true), true);
        assert.equal(m.isNightcordGuild("999", true), false);
        assert.equal(m.isNightcordGuild(null), false);
        assert.equal(m.isNightcordGuild(undefined, true), false);
    });
});
