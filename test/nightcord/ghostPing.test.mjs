/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// GhostPing must recognise a direct @mention or a reply to you, and ignore everything else.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let pingsMe;
before(async () => ({ pingsMe } = await load("src/nightcordplugins/ghostPing/detect.ts")));

const ME = "111";
const OTHER = "222";

describe("GhostPing", () => {
    it("catches a direct mention, whether mentions are ids or user objects", () => {
        assert.equal(pingsMe({ author: { id: OTHER }, mentions: ["111"] }, ME), true);
        assert.equal(pingsMe({ author: { id: OTHER }, mentions: [{ id: "111" }] }, ME), true);
        assert.equal(pingsMe({ author: { id: OTHER }, mentions: [{ id: "999" }, { id: "111" }] }, ME), true);
    });

    it("catches a reply to one of your messages", () => {
        assert.equal(pingsMe({ author: { id: OTHER }, referenced_message: { author: { id: ME } } }, ME), true);
    });

    it("ignores mentions of other people and replies to others", () => {
        assert.equal(pingsMe({ author: { id: OTHER }, mentions: [{ id: "999" }] }, ME), false);
        assert.equal(pingsMe({ author: { id: OTHER }, referenced_message: { author: { id: "999" } } }, ME), false);
        assert.equal(pingsMe({ author: { id: OTHER }, mentions: [] }, ME), false);
    });

    it("never flags your own message as a ghost ping", () => {
        assert.equal(pingsMe({ author: { id: ME }, mentions: [{ id: ME }] }, ME), false);
    });

    it("is safe with missing fields", () => {
        assert.equal(pingsMe(undefined, ME), false);
        assert.equal(pingsMe({ author: { id: OTHER } }, ME), false);
        assert.equal(pingsMe({ author: { id: OTHER }, mentions: [{ id: ME }] }, undefined), false);
        assert.equal(pingsMe({ mentions: [null, { }, "111"] }, ME), true);
    });
});
