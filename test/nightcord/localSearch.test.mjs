/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// LocalSearch must match all query words, prefer exact phrases, sort newest-first and honour from:.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let searchMessages, parseQuery;
before(async () => ({ searchMessages, parseQuery } = await load("src/nightcordplugins/localSearch/search.ts")));

const msg = (id, content, ts, authorName = "Sasha") => ({ id, channelId: "c", authorId: "u", authorName, content, ts });
const corpus = [
    msg("1", "let's get pizza tonight", 100),
    msg("2", "the pizza place is closed", 200),
    msg("3", "I love pizza so much", 300, "Nikita"),
    msg("4", "sushi is better", 400),
    msg("5", "pizza party!!! who is in", 500)
];

const ids = res => res.map(r => r.id);

describe("LocalSearch", () => {
    it("parses words, phrases and from: filters", () => {
        assert.deepEqual(parseQuery("pizza from:nikita party"), { terms: ["pizza", "party"], from: ["nikita"] });
        assert.deepEqual(parseQuery("   "), { terms: [], from: [] });
    });

    it("returns every message containing all words, newest first", () => {
        assert.deepEqual(ids(searchMessages(corpus, "pizza")), ["5", "3", "2", "1"]);
    });

    it("requires all words to be present (AND)", () => {
        assert.deepEqual(ids(searchMessages(corpus, "pizza party")), ["5"]);
        assert.deepEqual(searchMessages(corpus, "pizza sushi"), []);
    });

    it("ranks an exact phrase above scattered words", () => {
        const c = [
            msg("a", "pizza at the place", 10),   // newer, but words are scattered
            msg("b", "pizza place", 5)            // older, but the exact phrase
        ];
        assert.deepEqual(ids(searchMessages(c, "pizza place")), ["b", "a"]);
    });

    it("filters by author with from:", () => {
        assert.deepEqual(ids(searchMessages(corpus, "from:nikita")), ["3"]);
        assert.deepEqual(ids(searchMessages(corpus, "from:nikita pizza")), ["3"]);
        assert.deepEqual(searchMessages(corpus, "from:nikita sushi"), []);
    });

    it("returns nothing for an empty query and respects the limit", () => {
        assert.deepEqual(searchMessages(corpus, ""), []);
        assert.equal(searchMessages(corpus, "pizza", 2).length, 2);
    });
});
