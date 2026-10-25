/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The privacy "outside connections" counter logs resources the Discord page loads from non-Discord servers.
// outsideHost decides what counts: an http(s) URL whose host is not Discord, not local, not the page itself.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const SELF = "discord.com";
let outsideHost;
before(async () => ({ outsideHost } = await load("src/utils/networkHosts.ts")));

describe("networkLog outsideHost", () => {
    it("returns the host of a real third-party https resource", () => {
        assert.equal(outsideHost("https://tracker.example.com/pic.png", SELF), "tracker.example.com");
        assert.equal(outsideHost("https://sub.foo.io:443/a?b=1", SELF), "sub.foo.io");
    });

    it("ignores Discord's own hosts", () => {
        for (const u of [
            "https://discord.com/x", "https://cdn.discordapp.com/y", "https://media.discordapp.net/z",
            "https://discordcdn.com/a", "https://discordstatus.com/b", "https://sub.discord.gg/c"
        ]) assert.equal(outsideHost(u, SELF), null, u);
    });

    it("ignores local and self hosts", () => {
        assert.equal(outsideHost("http://localhost/x", SELF), null);
        assert.equal(outsideHost("http://127.0.0.1/x", SELF), null);
        assert.equal(outsideHost("https://[::1]/x", SELF), null);
        assert.equal(outsideHost("https://discord.com/self", "discord.com"), null);
    });

    it("ignores non-http(s) and unparseable URLs", () => {
        for (const u of ["ftp://host/x", "ws://host/x", "data:text/plain,hi", "not a url"]) {
            assert.equal(outsideHost(u, SELF), null, u);
        }
    });
});
