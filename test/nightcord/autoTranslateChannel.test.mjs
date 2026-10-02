/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// AutoTranslateChannel must only send real text to the translator, not links/emoji/mentions.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let isTranslatable;
before(async () => ({ isTranslatable } = await load("src/nightcordplugins/autoTranslateChannel/detect.ts")));

describe("AutoTranslateChannel", () => {
    it("translates real text", () => {
        assert.equal(isTranslatable("hello how are you"), true);
        assert.equal(isTranslatable("Привет, как дела?"), true);
        assert.equal(isTranslatable("check this out https://x.com cool"), true);
    });

    it("skips messages with nothing to translate", () => {
        assert.equal(isTranslatable(""), false);
        assert.equal(isTranslatable(undefined), false);
        assert.equal(isTranslatable("https://example.com/a/b"), false);
        assert.equal(isTranslatable("<a:party:123456789> <:wave:987654321>"), false);
        assert.equal(isTranslatable("<@123> <#456> <@&789>"), false);
        assert.equal(isTranslatable("123 456 !!!"), false);
        assert.equal(isTranslatable("   "), false);
    });
});
