/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord safe mode: after FAILED_STARTS_FOR_SAFE_MODE starts in a row that never finish, Discord
// starts with only the required plugins, so a plugin that crashes it can't lock the user out. A corrupt
// or tampered startup.json must never run the counter backwards or disable the recovery.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let FAILED_STARTS_FOR_SAFE_MODE, parseFailedStarts, isSafeMode, countStart;
before(async () => ({ FAILED_STARTS_FOR_SAFE_MODE, parseFailedStarts, isSafeMode, countStart } =
    await load("src/main/safeModeState.ts")));

describe("safe mode: parseFailedStarts", () => {
    it("keeps a non-negative integer", () => {
        assert.equal(parseFailedStarts(0), 0);
        assert.equal(parseFailedStarts(3), 3);
        assert.equal(parseFailedStarts(999), 999);
    });

    it("rejects anything that is not a non-negative integer, falling back to 0", () => {
        for (const bad of [-1, -5, 2.5, NaN, Infinity, "3", null, undefined, {}, [], true]) {
            assert.equal(parseFailedStarts(bad), 0, `${String(bad)} should become 0`);
        }
    });
});

describe("safe mode: isSafeMode", () => {
    it("is 3 failed starts in a row by default", () => {
        assert.equal(FAILED_STARTS_FOR_SAFE_MODE, 3);
    });

    it("turns on only once the failed starts reach the threshold", () => {
        assert.equal(isSafeMode(0, false), false);
        assert.equal(isSafeMode(2, false), false);
        assert.equal(isSafeMode(3, false), true);
        assert.equal(isSafeMode(4, false), true);
    });

    it("turns on immediately when forced, whatever the count", () => {
        assert.equal(isSafeMode(0, true), true);
        assert.equal(isSafeMode(2, true), true);
    });

    it("honours a custom threshold", () => {
        assert.equal(isSafeMode(1, false, 2), false);
        assert.equal(isSafeMode(2, false, 2), true);
    });
});

describe("safe mode: countStart", () => {
    it("counts the current run as failed until the window reports otherwise", () => {
        assert.equal(countStart(0), 1);
        assert.equal(countStart(2), 3);
    });
});
