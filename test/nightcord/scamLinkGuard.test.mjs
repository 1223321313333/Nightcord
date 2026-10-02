/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// ScamLinkGuard must flag Discord/Steam look-alike links and leave real and unrelated links alone.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let scanForScams, hostOf;
before(async () => ({ scanForScams, hostOf } = await load("src/nightcordplugins/scamLinkGuard/detect.ts")));

const reasons = text => scanForScams(text).map(h => `${h.host}:${h.reason}`);
const flagged = text => scanForScams(text).length > 0;

describe("ScamLinkGuard", () => {
    it("leaves the real Discord and Steam domains alone", () => {
        for (const url of [
            "https://discord.com/nitro",
            "https://discord.gg/abcdef",
            "https://support.discord.com/hc/ru",
            "https://cdn.discordapp.com/attachments/1/2/x.png",
            "https://media.discordapp.net/x.png",
            "https://discord.gift/abc123",
            "https://steamcommunity.com/id/foo",
            "https://store.steampowered.com/app/1",
            "http://www.discord.com/"
        ]) {
            assert.deepEqual(scanForScams(url), [], url);
        }
    });

    it("leaves ordinary unrelated links alone", () => {
        for (const url of [
            "https://github.com/foo/bar",
            "https://youtube.com/watch?v=x",
            "https://ya.ru",
            "https://vk.com/id1",
            "https://example.com/discord", // brand only in the path, not the host
            "https://t.me/joinchat"
        ]) {
            assert.deepEqual(scanForScams(url), [], url);
        }
    });

    it("flags misspelled look-alike domains as typosquat", () => {
        for (const host of ["dlscord.com", "disc0rd.com", "discrod.com", "dicord.gg", "steamcomunity.com"]) {
            assert.deepEqual(reasons(`free nitro https://${host}/claim`), [`${host}:typosquat`], host);
        }
    });

    it("flags a real second-level label on a wrong top-level domain", () => {
        for (const host of ["discord.ru", "discord.xyz", "discord.gq", "discordapp.io", "steamcommunity.net"]) {
            assert.equal(scanForScams(`https://${host}/x`)[0]?.reason, "impersonation", host);
        }
    });

    it("flags a brand name mixed with bait or a hyphen as impersonation", () => {
        for (const host of [
            "discord-nitro.com", "discordnitro.xyz", "discord-gift.ru", "free-discord.com",
            "discordapp-login.com", "steamcommunity-gift.top", "discord.com-verify.ru"
        ]) {
            assert.equal(reasons(`https://${host}/`)[0], `${hostOf(`https://${host}/`)}:impersonation`, host);
        }
    });

    it("does not flag legitimate third parties that merely contain a brand word", () => {
        for (const url of [
            "https://discord.js.org/",      // a dev docs site on js.org
            "https://disboard.org/",
            "https://top.gg/"
        ]) {
            assert.deepEqual(scanForScams(url), [], url);
        }
    });

    it("flags masked links whose text and destination differ", () => {
        const hits = scanForScams("[discord.com/nitro](https://evil-grab.ru/login)");
        assert.equal(hits.length, 1);
        assert.equal(hits[0].reason, "masked");
        assert.equal(hits[0].host, "evil-grab.ru");
        assert.equal(hits[0].shownAs, "discord.com");
    });

    it("does not flag masked links that point where they say", () => {
        assert.deepEqual(scanForScams("[open discord](https://discord.com/channels/@me)"), []);
        assert.deepEqual(scanForScams("[click here](https://github.com/x)"), []);
    });

    it("handles plain text with no links, and junk input", () => {
        assert.deepEqual(scanForScams("hello how are you"), []);
        assert.deepEqual(scanForScams(""), []);
        assert.deepEqual(scanForScams(undefined), []);
        assert.deepEqual(scanForScams("not a url: discord-nitro"), []);
    });

    it("dedupes repeated hosts and caps the number of hits", () => {
        const hits = scanForScams("https://discord-nitro.com/a https://discord-nitro.com/b");
        assert.equal(hits.length, 1);
    });

    it("ignores trailing punctuation on a link", () => {
        assert.deepEqual(reasons("смотри тут https://discord-gift.ru."), ["discord-gift.ru:impersonation"]);
    });
});
