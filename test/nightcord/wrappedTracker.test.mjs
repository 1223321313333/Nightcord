/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The Wrapped tracker folds each of your own messages into running counters (totals, per-channel, hours,
// weekdays, chars, links, images, files) and a daily streak. That accumulation is pure (applyMessage /
// applyReaction on a state from emptyStored) and tested here.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let emptyStored, applyMessage, applyReaction;
before(async () => ({ emptyStored, applyMessage, applyReaction } = await load("src/nightcordplugins/wrapped/tracker.ts")));

const DAY = 86_400_000;
const sum = arr => arr.reduce((a, b) => a + b, 0);
// local noon, so adding whole days never crosses a DST-sensitive midnight
const day = (offset = 0) => new Date(2026, 0, 2, 12, 0, 0).getTime() + offset * DAY;
const message = over => ({ ts: day(), channelId: "c1", content: "", attachments: 0, isImage: false, ...over });

describe("Wrapped tracker applyMessage", () => {
    it("folds one message into every counter", () => {
        const d = emptyStored();
        applyMessage(d, message({ content: "hi https://a.com https://b.com", attachments: 2, isImage: true }));
        assert.equal(d.total, 1);
        assert.equal(d.channels.c1, 1);
        assert.equal(sum(d.hours), 1);
        assert.equal(sum(d.weekdays), 1);
        assert.equal(d.chars, "hi https://a.com https://b.com".length);
        assert.equal(d.links, 2);
        assert.equal(d.images, 1);
        assert.equal(d.files, 2);
        assert.equal(d.activeDays, 1);
        assert.equal(d.curStreak, 1);
        assert.equal(d.bestStreak, 1);
    });

    it("two messages on the same day accumulate but count the day once", () => {
        const d = emptyStored();
        applyMessage(d, message({ content: "a" }));
        applyMessage(d, message({ ts: day() + 1000, content: "b" }));
        assert.equal(d.total, 2);
        assert.equal(d.channels.c1, 2);
        assert.equal(d.activeDays, 1);
        assert.equal(d.curStreak, 1);
    });

    it("consecutive days extend the streak", () => {
        const d = emptyStored();
        applyMessage(d, message({ ts: day(0) }));
        applyMessage(d, message({ ts: day(1) }));
        assert.equal(d.activeDays, 2);
        assert.equal(d.curStreak, 2);
        assert.equal(d.bestStreak, 2);
    });

    it("a gap resets the current streak but keeps the best", () => {
        const d = emptyStored();
        applyMessage(d, message({ ts: day(0) }));
        applyMessage(d, message({ ts: day(1) })); // streak 2
        applyMessage(d, message({ ts: day(5) })); // gap -> streak 1
        assert.equal(d.curStreak, 1);
        assert.equal(d.bestStreak, 2);
        assert.equal(d.activeDays, 3);
    });

    it("empty content adds no chars or links", () => {
        const d = emptyStored();
        applyMessage(d, message({ content: "" }));
        assert.equal(d.chars, 0);
        assert.equal(d.links, 0);
    });
});

describe("Wrapped tracker applyReaction", () => {
    it("counts each reaction given", () => {
        const d = emptyStored();
        applyReaction(d);
        applyReaction(d);
        assert.equal(d.reactionsGiven, 2);
    });
});
