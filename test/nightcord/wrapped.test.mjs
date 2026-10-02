/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Wrapped must derive the recap numbers and track active-day streaks correctly.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let summarize, streakStep, emptyRaw;
before(async () => ({ summarize, streakStep, emptyRaw } = await load("src/nightcordplugins/wrapped/summary.ts")));

const DAY = 86_400_000;

describe("Wrapped summary", () => {
    it("ranks top channels with share percentages", () => {
        const raw = { ...emptyRaw(0), total: 10, channels: { a: 6, b: 3, c: 1 } };
        const s = summarize(raw, 2, DAY);
        assert.equal(s.topChannels.length, 2);
        assert.deepEqual(s.topChannels[0], { id: "a", count: 6, share: 60 });
        assert.deepEqual(s.topChannels[1], { id: "b", count: 3, share: 30 });
    });

    it("finds the peak hour and weekday", () => {
        const hours = new Array(24).fill(0); hours[21] = 50;
        const weekdays = new Array(7).fill(0); weekdays[5] = 9;
        const s = summarize({ ...emptyRaw(0), total: 59, hours, weekdays });
        assert.equal(s.peakHour, 21);
        assert.equal(s.peakWeekday, 5);
    });

    it("computes averages and span without dividing by zero", () => {
        const now = 10 * DAY;
        const s = summarize({ ...emptyRaw(0), total: 20, chars: 400, activeDays: 4 }, 5, now);
        assert.equal(s.avgLength, 20);
        assert.equal(s.perActiveDay, 5);
        assert.equal(Math.round(s.spanDays), 10);

        const empty = summarize(emptyRaw(0), 5, now);
        assert.equal(empty.avgLength, 0);
        assert.equal(empty.perActiveDay, 0);
        assert.equal(empty.total, 0);
    });
});

describe("Wrapped streaks", () => {
    it("starts a streak on the first day", () => {
        assert.deepEqual(streakStep(null, 0, 100), { dayNum: 100, streak: 1, isNewDay: true });
    });

    it("extends on a consecutive day and does not count the same day twice", () => {
        assert.deepEqual(streakStep(100, 1, 100), { dayNum: 100, streak: 1, isNewDay: false });
        assert.deepEqual(streakStep(100, 1, 101), { dayNum: 101, streak: 2, isNewDay: true });
        assert.deepEqual(streakStep(101, 2, 102), { dayNum: 102, streak: 3, isNewDay: true });
    });

    it("resets the streak after a gap", () => {
        assert.deepEqual(streakStep(100, 5, 105), { dayNum: 105, streak: 1, isNewDay: true });
    });
});
