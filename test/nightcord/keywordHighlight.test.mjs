/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// KeywordHighlight builds a case-insensitive, Unicode whole-word matcher from the user's comma-separated
// keywords. The parsing, escaping and word-boundary behaviour (including Russian) are pure and tested here.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let parseKeywords, escapeKeyword, buildMatcher;
before(async () => ({ parseKeywords, escapeKeyword, buildMatcher } = await load("src/nightcordplugins/keywordHighlight/match.ts")));

describe("parseKeywords", () => {
    it("splits on commas, trims and drops empties", () => {
        assert.deepEqual(parseKeywords("a, b ,, c "), ["a", "b", "c"]);
        assert.deepEqual(parseKeywords(""), []);
        assert.deepEqual(parseKeywords("   ,  , "), []);
    });
});

describe("escapeKeyword", () => {
    it("escapes regex metacharacters", () => {
        assert.equal(escapeKeyword("a.b*c"), "a\\.b\\*c");
        assert.equal(escapeKeyword("(x)[y]"), "\\(x\\)\\[y\\]");
    });
});

describe("buildMatcher", () => {
    it("returns null when nothing usable is left", () => {
        assert.equal(buildMatcher([]), null);
        assert.equal(buildMatcher(["a", ""]), null, "words shorter than 2 chars are dropped");
    });

    it("matches a whole word case-insensitively but not inside another word", () => {
        const re = buildMatcher(["cat"]);
        assert.ok(re.test("a Cat here"));
        assert.ok(!re.test("category"));
        assert.ok(!re.test("concat"));
    });

    it("works with Russian (Unicode) word boundaries", () => {
        const re = buildMatcher(["кот"]);
        assert.ok(re.test("мой Кот спит"));
        assert.ok(!re.test("коток"));
    });

    it("treats keywords literally, escaping metacharacters", () => {
        const re = buildMatcher(["a.b"]);
        assert.ok(re.test("a.b"));
        assert.ok(!re.test("axb"));
    });

    it("drops short words and de-duplicates", () => {
        const re = buildMatcher(["ab", "x", "ab"]);
        assert.ok(re.test("ab"));
        assert.ok(!re.test("x"));
        assert.equal(re.source.match(/ab/g).length, 1, "duplicate keyword should appear once");
    });
});
