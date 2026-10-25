/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// markupToText / markupToHtml resolve <@user>, <@&role> and <#channel> mentions through Discord's stores,
// and render <t:...> timestamps. Those store-backed paths are exercised here with a stubbed @webpack/common,
// so a regression in how a mention or timestamp is turned into text/HTML is caught directly.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const stores = `
export const ChannelStore = { getChannel: id => id === "555" ? { name: "общий" } : null };
export const GuildRoleStore = { getRole: (g, id) => id === "777" ? { name: "Модераторы" } : null };
export const UserStore = { getUser: id => id === "42" ? { globalName: "Кеша" } : null };
export const Constants = {}; export const RestAPI = {};
`;

let markupToText, markupToHtml;
before(async () => ({ markupToText, markupToHtml } = await load("src/nightcordplugins/_shared/messages.ts", { "@webpack/common": stores })));

describe("markupToText with stores", () => {
    it("resolves user, role and channel mentions", () => {
        assert.equal(markupToText("<@42> <@&777> <#555>", { guildId: "g" }), "@Кеша @Модераторы #общий");
    });

    it("falls back to generic words for unknown ids", () => {
        assert.equal(markupToText("<@999> <@&888> <#111>", { guildId: "g" }), "@пользователь @роль #канал");
    });

    it("needs a guild id to resolve a role", () => {
        // without guildId the role name cannot be looked up, so the generic word is used
        assert.equal(markupToText("<@&777>"), "@роль");
    });

    it("replaces a <t:...> timestamp with rendered text", () => {
        const out = markupToText("at <t:1700000000:F>");
        assert.ok(!out.includes("<t:"), out);
        assert.ok(out.startsWith("at "), out);
    });
});

describe("markupToHtml with stores", () => {
    it("wraps resolved mentions in mention spans", () => {
        const html = markupToHtml("<@42> <@&777> <#555>", { guildId: "g" });
        assert.ok(html.includes('<span class="mention">@Кеша</span>'), html);
        assert.ok(html.includes('<span class="mention">@Модераторы</span>'), html);
        assert.ok(html.includes('<span class="mention">#общий</span>'), html);
    });

    it("renders a timestamp in a ts span", () => {
        const html = markupToHtml("<t:1700000000:F>");
        assert.match(html, /<span class="ts">[^<]+<\/span>/);
    });

    it("renders custom emoji as an image using the emoji CDN", () => {
        const html = markupToHtml("<:pepe:123> <a:dance:456>");
        assert.ok(html.includes('src="https://cdn.discordapp.com/emojis/123.png?size=48"'), html);
        assert.ok(html.includes('src="https://cdn.discordapp.com/emojis/456.gif?size=48"'), html);
    });
});
