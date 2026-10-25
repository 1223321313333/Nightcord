/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// CleanOpenedLinks strips tracking parameters from links other people send, using the ClearURLs plugin.
// Its clean() guard must pass non-http(s) and non-string input through untouched, fall back to the original
// link when ClearURLs is not ready, and never throw.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const pluginManager = clearUrls => ({ "@api/PluginManager": `export const plugins = { ClearURLs: ${clearUrls} };` });

let ready, notReady, throwing;
before(async () => {
    ready = (await load("src/nightcordplugins/cleanOpenedLinks/index.ts",
        pluginManager(`{ rules: [1], replacer: url => url.split("?")[0] }`))).default;
    notReady = (await load("src/nightcordplugins/cleanOpenedLinks/index.ts",
        pluginManager(`{ rules: [], replacer: url => "SHOULD_NOT_RUN" }`))).default;
    throwing = (await load("src/nightcordplugins/cleanOpenedLinks/index.ts",
        pluginManager(`{ rules: [1], replacer: () => { throw new Error("boom"); } }`))).default;
});

describe("CleanOpenedLinks clean()", () => {
    it("passes non-string and non-http(s) input through unchanged", () => {
        assert.equal(ready.clean(undefined), undefined);
        assert.equal(ready.clean(123), 123);
        assert.equal(ready.clean("ftp://host/x"), "ftp://host/x");
        assert.equal(ready.clean("just text"), "just text");
    });

    it("delegates http(s) links to ClearURLs", () => {
        assert.equal(ready.clean("https://example.com/path?utm_source=a&id=1"), "https://example.com/path");
    });

    it("returns the link unchanged when ClearURLs has no rules loaded", () => {
        assert.equal(notReady.clean("https://example.com/x?utm_source=a"), "https://example.com/x?utm_source=a");
    });

    it("returns the original link if ClearURLs throws", () => {
        assert.equal(throwing.clean("https://example.com/x?utm_source=a"), "https://example.com/x?utm_source=a");
    });
});
