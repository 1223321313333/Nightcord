/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// ChatStats aggregates a channel's messages into a summary. The counts, author ranking, plural forms and
// reaction totals are what matter and must stay correct; the peak hour/day and date range depend on the
// machine's timezone, so they are not asserted here.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let buildStats;
before(async () => ({ buildStats } = await load("src/nightcordplugins/chatStats/index.ts")));

let seq = 0;
const author = (id, name, bot = false) => ({ id, username: name, global_name: name, bot });
const msg = (a, content = "", extra = {}) => ({
    id: String(++seq), channel_id: "c", type: 0, author: a, content,
    timestamp: "2026-01-01T12:00:00.000Z", ...extra
});

const alice = author("1", "Alice");
const bob = author("2", "Bob");

describe("ChatStats buildStats", () => {
    it("ranks authors by message count with percentages", () => {
        const out = buildStats([msg(alice, "a"), msg(alice, "b"), msg(alice, "c"), msg(bob, "d")]);
        assert.match(out, /последние 4 сообщения/);
        assert.match(out, /Писали: \*\*2\*\*/);
        assert.ok(out.includes("1. Alice — 3 сообщения (75%)"), out);
        assert.ok(out.includes("2. Bob — 1 сообщение (25%)"), out);
    });

    it("marks bots and keeps the author's display name", () => {
        const robot = author("9", "Helper", true);
        const out = buildStats([msg(robot, "beep"), msg(alice, "hi")]);
        assert.ok(out.includes("Helper 🤖 — 1 сообщение"), out);
        assert.ok(!out.includes("Alice 🤖"), "a human must not get the bot marker");
    });

    it("counts links, images and files", () => {
        const out = buildStats([
            msg(alice, "see https://a.com and https://b.com"),
            msg(alice, "", { attachments: [{ content_type: "image/png" }] }),
            msg(bob, "", { embeds: [{ type: "gifv" }] }),
            msg(bob, "", { attachments: [{ content_type: "application/zip" }, { content_type: "text/plain" }] })
        ]);
        assert.ok(out.includes("ссылок: **2**"), out);
        assert.ok(out.includes("с картинками: **2**"), out); // one image attachment + one gifv embed
        assert.ok(out.includes("файлов: **3**"), out); // 1 + 2 attachments
    });

    it("aggregates reactions and lists the most used first", () => {
        const out = buildStats([
            msg(alice, "x", { reactions: [{ emoji: { id: null, name: "👍" }, count: 2 }] }),
            msg(bob, "y", {
                reactions: [
                    { emoji: { id: null, name: "👍" }, count: 3 },
                    { emoji: { id: "123", name: "pog" }, count: 10 }
                ]
            })
        ]);
        assert.ok(out.includes("**Реакции:** :pog: 10 · 👍 5"), out);
    });

    it("uses the right Russian plural for the message count", () => {
        assert.match(buildStats([msg(alice, "x")]), /последние 1 сообщение(?:\n|$)/);
        assert.match(buildStats([msg(alice, "x"), msg(alice, "y")]), /последние 2 сообщения(?:\n|$)/);
        assert.match(buildStats(Array.from({ length: 5 }, () => msg(alice, "x"))), /последние 5 сообщений(?:\n|$)/);
    });

    it("renders a 24-hour sparkline from the bar glyphs", () => {
        const out = buildStats([msg(alice, "x"), msg(bob, "y")]);
        const spark = out.match(/\(0.23\): `([^`]+)`/)?.[1];
        assert.equal(spark?.length, 24, "sparkline must have one bar per hour");
        assert.ok([...spark].every(c => "▁▂▃▄▅▆▇█".includes(c)), `unexpected glyph in ${spark}`);
    });

    it("counts only image attachments and image/gifv embeds as pictures", () => {
        const out = buildStats([
            msg(alice, "", { attachments: [{ content_type: "image/gif" }] }), // image
            msg(alice, "", { embeds: [{ type: "image" }] }),                   // image
            msg(bob, "", { embeds: [{ type: "gifv" }] }),                      // image
            msg(bob, "", { attachments: [{ content_type: "video/mp4" }] }),    // not an image
            msg(alice, "", { embeds: [{ type: "video" }] }),                   // not an image
            msg(bob, "", { embeds: [{ type: "rich" }] })                       // not an image
        ]);
        assert.ok(out.includes("с картинками: **3**"), out);
    });
});
