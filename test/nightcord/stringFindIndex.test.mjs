/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// StringFindIndex (the patcher's fast lookup of patch finds) must give exactly what source.includes(find) gives

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let StringFindIndex;
before(async () => ({ StringFindIndex } = await load("src/webpack/stringFindIndex.ts")));

/** Small alphabet, so finds really occur and hash buckets collide */
function randomText(rand, length) {
    const alphabet = "ab.(){}:,\"=\\ей";
    let s = "";
    for (let i = 0; i < length; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
    return s;
}

function seeded(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
}

const naive = (finds, source) => {
    const found = finds.filter(f => source.includes(f));
    return found.length ? new Set(found) : null;
};

describe("StringFindIndex", () => {
    it("matches includes() on random finds and sources", () => {
        const rand = seeded(42);
        for (let round = 0; round < 60; round++) {
            const finds = [...new Set(Array.from({ length: 80 }, () => randomText(rand, 1 + Math.floor(rand() * 14))))];
            const index = new StringFindIndex(finds);
            for (let n = 0; n < 20; n++) {
                const source = randomText(rand, Math.floor(rand() * 400));
                assert.deepEqual(index.match(source), naive(finds, source), `round ${round}, source ${JSON.stringify(source)}`);
            }
        }
    });

    it("finds text at the very start and end, and real patch finds", () => {
        const finds = ["getLegacyUsername(){", "#{intl::PROFILE_USER_BADGES}", "async uploadFiles(", "x"];
        const index = new StringFindIndex(finds);
        assert.deepEqual(index.match("getLegacyUsername(){return 1}"), new Set(["getLegacyUsername(){"]));
        assert.deepEqual(index.match("...async uploadFiles("), new Set(["async uploadFiles("]));
        assert.deepEqual(index.match("a#{intl::PROFILE_USER_BADGES}x"), new Set(["#{intl::PROFILE_USER_BADGES}", "x"]));
        assert.equal(index.match("nothing here"), null);
        assert.equal(index.match(""), null);
    });

    it("works with no finds", () => {
        assert.equal(new StringFindIndex([]).match("anything"), null);
    });
});
