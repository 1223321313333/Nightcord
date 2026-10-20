/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// genCspHosts builds the strict-connections plugin allowlist. extractHosts must find real hosts a plugin
// contacts and skip the ones Discord's own CSP already covers (and noise like example/localhost/license links).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import genCspHosts from "../../scripts/nightcord/genCspHosts.cjs";

const { extractHosts } = genCspHosts;
const hosts = text => [...extractHosts(text)].sort();

describe("genCspHosts.extractHosts", () => {
    it("finds hosts from http(s) URLs, lower-cased and deduped", () => {
        assert.deepEqual(
            hosts('fetch("https://My.Service.io/a"); img("http://cdn.my-host.net/b"); again("https://my.service.io/c")'),
            ["cdn.my-host.net", "my.service.io"]
        );
    });

    it("skips Discord's own hosts (covered by Discord's CSP)", () => {
        assert.deepEqual(hosts("https://cdn.discordapp.com/x https://media.discordapp.net/y https://discord.com/z"), []);
    });

    it("skips example, localhost and license/spec links", () => {
        assert.deepEqual(hosts(`
            https://example.com/a
            https://sub.example.org/b
            https://www.gnu.org/licenses/gpl-3.0.html
            https://www.w3.org/TR/
        `), []);
    });

    it("needs a dotted host and ignores bare words or schemeless text", () => {
        assert.deepEqual(hosts("http://localhost/x visit example without scheme or a plain word"), []);
    });

    it("keeps a real third-party API host", () => {
        assert.deepEqual(hosts('const API = "https://decor.fieryflames.dev/api";'), ["decor.fieryflames.dev"]);
    });
});
