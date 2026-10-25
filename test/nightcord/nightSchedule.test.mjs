/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// NightSchedule decides whether "now" falls inside the night window. The window can wrap past midnight
// (23:00 to 07:00 is the default), which is the easy case to get wrong, so the boundaries are tested.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let isNight;
before(async () => ({ isNight } = await load("src/nightcordplugins/nightSchedule/schedule.ts")));

describe("NightSchedule isNight", () => {
    it("handles a same-day window (start < end)", () => {
        const night = h => isNight(h, 9, 17);
        assert.equal(night(8), false);
        assert.equal(night(9), true, "start hour is inside");
        assert.equal(night(16), true);
        assert.equal(night(17), false, "end hour is outside");
    });

    it("handles a window that wraps past midnight (start > end)", () => {
        const night = h => isNight(h, 23, 7);
        assert.equal(night(23), true, "start hour is inside");
        assert.equal(night(0), true);
        assert.equal(night(6), true);
        assert.equal(night(7), false, "end hour is outside");
        assert.equal(night(12), false);
        assert.equal(night(22), false);
    });

    it("is never night when start equals end", () => {
        for (const h of [0, 5, 10, 23]) assert.equal(isNight(h, 10, 10), false);
    });

    it("rounds the start and end hours", () => {
        // 22.4 -> 22, 7.6 -> 8
        assert.equal(isNight(22, 22.4, 7.6), true);
        assert.equal(isNight(7, 22.4, 7.6), true);
        assert.equal(isNight(8, 22.4, 7.6), false);
    });
});
