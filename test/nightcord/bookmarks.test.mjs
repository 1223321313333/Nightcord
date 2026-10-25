/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// A bookmark stores a short preview of the saved message. describeBookmark picks it: message text first,
// then attachments, then the first embed's title/description, then a sticker, then a placeholder.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let describeBookmark;
before(async () => ({ describeBookmark } = await load("src/nightcordplugins/bookmarks/describe.ts")));

const msg = over => ({ content: "", ...over });

describe("describeBookmark", () => {
    it("uses the trimmed message text when there is any", () => {
        assert.equal(describeBookmark(msg({ content: "  hello there  " }), null), "hello there");
    });

    it("renders custom emoji markup in the text", () => {
        assert.equal(describeBookmark(msg({ content: "yo <:smile:123>" }), null), "yo :smile:");
    });

    it("falls back to attachment names when there is no text", () => {
        assert.equal(describeBookmark(msg({ attachments: [{ filename: "a.png" }, { filename: "b.zip" }] }), null), "📎 a.png, b.zip");
    });

    it("whitespace-only text falls through to the next source", () => {
        assert.equal(describeBookmark(msg({ content: "   ", attachments: [{ filename: "x.gif" }] }), null), "📎 x.gif");
    });

    it("falls back to an embed title, then its description", () => {
        assert.equal(describeBookmark(msg({ embeds: [{ rawTitle: "The Title" }] }), null), "▌ The Title");
        assert.equal(describeBookmark(msg({ embeds: [{ description: "Just a description" }] }), null), "▌ Just a description");
    });

    it("falls back to a sticker name", () => {
        assert.equal(describeBookmark(msg({ stickerItems: [{ name: "Котик" }] }), null), "🏷️ стикер «Котик»");
    });

    it("uses a placeholder when the message has nothing to show", () => {
        assert.equal(describeBookmark(msg(), null), "(без текста)");
    });
});
