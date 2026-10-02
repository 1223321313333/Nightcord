/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// ImpersonationGuard must spot a stranger using a friend's name/avatar, and never flag the friend themselves.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let normalizeName, buildFriendMap, findImpersonation;
before(async () => ({ normalizeName, buildFriendMap, findImpersonation } = await load("src/nightcordplugins/impersonationGuard/detect.ts")));

const friends = [
    { id: "f1", name: "Никита", avatar: "av_nikita", aliases: ["nikita_real"] },
    { id: "f2", name: "Sasha", avatar: "av_sasha" }
];

describe("ImpersonationGuard", () => {
    it("normalizes case, spacing and invisible characters", () => {
        assert.equal(normalizeName("Ni ki ta"), "nikita");
        assert.equal(normalizeName("Sasha​"), "sasha");
        assert.equal(normalizeName("  ПРИВЕТ  "), "привет");
        assert.equal(normalizeName(undefined), "");
    });

    it("flags a stranger copying a friend's name", () => {
        const map = buildFriendMap(friends);
        const hit = findImpersonation(["никита"], "stranger", null, map);
        assert.deepEqual(hit, { friend: "Никита", sameAvatar: false });
    });

    it("marks it stronger when the avatar matches too", () => {
        const map = buildFriendMap(friends);
        const hit = findImpersonation(["Sasha"], "stranger", "av_sasha", map);
        assert.deepEqual(hit, { friend: "Sasha", sameAvatar: true });
    });

    it("matches a friend's alias (username) as well", () => {
        const map = buildFriendMap(friends);
        assert.equal(findImpersonation(["nikita_real"], "stranger", null, map)?.friend, "Никита");
    });

    it("never flags the friend on their own account", () => {
        const map = buildFriendMap(friends);
        assert.equal(findImpersonation(["Никита"], "f1", "av_nikita", map), null);
    });

    it("leaves unrelated names alone", () => {
        const map = buildFriendMap(friends);
        assert.equal(findImpersonation(["randomguy", "", null], "stranger", "x", map), null);
    });

    it("checks several candidate names (nick, global name, username)", () => {
        const map = buildFriendMap(friends);
        assert.equal(findImpersonation(["coolnick", "Sasha", "s_a_s_h_a"], "stranger", null, map)?.friend, "Sasha");
    });
});
