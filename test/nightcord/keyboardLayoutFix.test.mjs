/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// KeyboardLayoutFix: messages typed in the English layout become Russian, real English is left alone

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let fixMessage, switchLayout, looksLikeWrongLayout;
before(async () => ({ fixMessage, switchLayout, looksLikeWrongLayout } = await load("src/nightcordplugins/keyboardLayoutFix/index.tsx")));

describe("switchLayout", () => {
    it("switches both ways", () => {
        assert.equal(switchLayout("ghbdtn"), "привет");
        assert.equal(switchLayout("руддщ"), "hello");
    });
});

describe("fixMessage", () => {
    const fixed = [
        ["ghbdtn", "привет"],
        ["rfr ltkf?", "как дела,"],
        ["ghbdtn, rfr ltkf", "приветб как дела"],
        ["cvjnhb https://example.com/abc ntgthm", "смотри https://example.com/abc теперь"],
        ["ghbdtn <@123456> rfr ltkf", "привет <@123456> как дела"],
        ["ghbdtn :smile: ltkf", "привет :smile: дела"],
        ["cs2 ghbdtn", "cs2 привет"],
        ["nfr b cltkfq", "так и сделай"],
        ["z ,ele ljvf xthtp xfc", "я буду дома через час"]
    ];
    for (const [input, expected] of fixed) {
        it(`fixes ${JSON.stringify(input)}`, () => assert.equal(fixMessage(input), expected));
    }

    const leftAlone = [
        "xDDDDD", "hmmmmm", "brrrrr", "zzzzzz", "rhythm crypt lynx", "hello how are you", "gg wp", "lol",
        "привет", "/ghbdtn command", "`ghbdtn`", "ok ok ok ok", "nice one bro", "what's up guys", "https://github.com"
    ];
    for (const input of leftAlone) {
        it(`leaves ${JSON.stringify(input)} alone`, () => assert.equal(fixMessage(input), null));
    }
});

describe("looksLikeWrongLayout", () => {
    it("recognises Latin text that is really Russian on the EN layout", () => {
        assert.equal(looksLikeWrongLayout(["ghbdtn"]), true);            // привет
        assert.equal(looksLikeWrongLayout(["nfr", "b", "cltkfq"]), true); // так и сделай
    });

    it("leaves real English, Cyrillic, slang, laughter and consonant words alone", () => {
        assert.equal(looksLikeWrongLayout(["привет"]), false);                // already Cyrillic
        assert.equal(looksLikeWrongLayout(["hello", "how", "are", "you"]), false); // normal English
        assert.equal(looksLikeWrongLayout(["gg", "wp"]), false);              // too short
        assert.equal(looksLikeWrongLayout(["xDDDDD"]), false);                // long run
        assert.equal(looksLikeWrongLayout(["hmmmmm"]), false);                // long run
        assert.equal(looksLikeWrongLayout(["rhythm", "crypt", "lynx"]), false); // vowel-less English
    });
});
