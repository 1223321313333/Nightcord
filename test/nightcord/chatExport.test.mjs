/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// ChatExport: a sample channel with hostile content, rendered to HTML, TXT and JSON

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const stores = `
export const ChannelStore = { getChannel: id => id === "555" ? { name: "общий" } : null };
export const GuildRoleStore = { getRole: (g, id) => id === "777" ? { name: "Модераторы" } : null };
export const UserStore = { getUser: id => id === "42" ? { globalName: "Кеша" } : null };
export const Constants = {}; export const RestAPI = {};
`;

const alice = { id: "1", username: "alice", global_name: "Алиса", avatar: null };
const bob = { id: "2", username: "bob", global_name: null, avatar: "a_abc", bot: true };
const at = (d, h, m) => new Date(2026, 8, d, h, m).toISOString();
const messages = [
    { id: "10", channel_id: "c", type: 0, author: alice, timestamp: at(27, 21, 0), content: "Привет, <@42> и <@&777>! Смотри в <#555> **жирный** *курсив* __подчёркнутый__ ~~зачёркнутый~~ ||спойлер|| `код` <:pepe:123> <a:dance:456>" },
    { id: "11", channel_id: "c", type: 0, author: alice, timestamp: at(27, 21, 2), content: "```js\nconst x = \"<b>not bold</b>\";\n```\n> цитата\n-# мелкий текст\nhttps://example.com/путь?a=1&b=2, и [маска](https://discord.com)" },
    {
        id: "12", channel_id: "c", type: 19, author: bob, timestamp: at(27, 21, 3), edited_timestamp: at(27, 21, 4),
        content: "<script>alert(1)</script> \"><img src=x onerror=alert(2)> [bad](javascript:alert(3))",
        referenced_message: { id: "10", author: alice, content: "Привет, <@42>", type: 0, timestamp: at(27, 21, 0), channel_id: "c" },
        attachments: [
            { id: "a", filename: "cat.png", url: "https://cdn.discordapp.com/attachments/1/2/cat.png", size: 12345, content_type: "image/png" },
            { id: "b", filename: "\"><svg onload=alert(4)>.zip", url: "https://cdn.discordapp.com/attachments/1/3/x.zip", size: 5000000 }
        ],
        embeds: [
            { type: "rich", title: "Заголовок <i>", url: "https://example.com", description: "Описание **жирное**", color: 0x8b5cf6, fields: [{ name: "Поле", value: "значение" }], image: { url: "https://tracker.example/pic.png", proxy_url: "https://images-ext-1.discordapp.net/external/x/pic.png" } }
        ],
        reactions: [{ emoji: { id: null, name: "👍" }, count: 3 }, { emoji: { id: "123", name: "pepe" }, count: 1 }]
    },
    { id: "13", channel_id: "c", type: 7, author: { id: "3", username: "newbie" }, timestamp: at(28, 9, 0), content: "" },
    { id: "14", channel_id: "c", type: 0, author: alice, timestamp: at(28, 9, 1), content: "Время: <t:1790000000:F>, команда </help:1>", sticker_items: [{ id: "s", name: "Котик" }] }
];
const info = { title: "Тест — #общий", guildId: "g", channelId: "c" };

let html, txt, json, buildStats;
before(async () => {
    const mod = await load(
        { contents: `export * from "./chatExport/render"; export * from "./chatStats/index";`, resolveDir: "src/nightcordplugins" },
        { "@webpack/common": stores }
    );
    html = mod.toHtml(info, messages);
    txt = mod.toTxt(info, messages);
    json = JSON.parse(mod.toJson(info, messages));
    buildStats = mod.buildStats;
});

describe("HTML export is safe", () => {
    it("has no live script, handlers or javascript: links", () => {
        assert.ok(!html.includes("<script>alert"));
        assert.ok(!/<img[^>]*onerror/i.test(html));
        assert.ok(!/<svg[^>]*onload/i.test(html));
        assert.ok(!/href="javascript:/i.test(html));
    });
    it("forbids scripts and referrers by policy", () => {
        assert.match(html, /Content-Security-Policy" content="default-src 'none'/);
        assert.match(html, /name="referrer" content="no-referrer"/);
    });
    it("loads embed pictures through Discord's proxy", () => {
        assert.ok(html.includes("images-ext-1.discordapp.net/external/x/pic.png"));
        assert.ok(!html.includes("tracker.example"));
    });
    it("escapes code blocks instead of formatting them", () => assert.ok(html.includes("&lt;b&gt;not bold&lt;/b&gt;")));
});

describe("HTML export looks like Discord", () => {
    const expectations = {
        "resolves mentions": ["@Кеша", "@Модераторы", "#общий"],
        "shows custom emoji": ["cdn.discordapp.com/emojis/123.png", "/emojis/456.gif"],
        "formats text": ["<b>жирный</b>", "<i>курсив</i>", "<u>подчёркнутый</u>", "<s>зачёркнутый</s>", '<span class="spoiler">спойлер</span>'],
        "renders quotes and subtext": ['<div class="quote">цитата</div>', '<div class="sub">мелкий текст</div>'],
        "escapes & in links": ['href="https://example.com/путь?a=1&amp;b=2"'],
        "keeps masked links": ['<a href="https://discord.com" rel="noreferrer">маска</a>'],
        "shows replies and edits": ['class="reply">↪ <b>Алиса</b>', "(изменено)"],
        "shows attachments": ['src="https://cdn.discordapp.com/attachments/1/2/cat.png"', "4.8 МБ"],
        "renders embeds": ["Заголовок &lt;i&gt;", "<b>жирное</b>", "#8b5cf6"],
        "shows reactions": ["👍 3"],
        "marks bots and animated avatars": ['class="bot">БОТ', "avatars/2/a_abc.gif"],
        "uses default avatars": ["cdn.discordapp.com/embed/avatars/"],
        "describes system messages": ["присоединился к серверу"],
        "groups messages": ['class="msg cont" id="m11"'],
        "shows commands and stickers": ["/help", "стикер «Котик»"]
    };
    for (const [name, parts] of Object.entries(expectations)) {
        it(name, () => { for (const p of parts) assert.ok(html.includes(p), p); });
    }
    it("separates days and renders timestamps", () => {
        assert.equal((html.match(/class="day"/g) || []).length, 2);
        assert.ok(!html.includes("&lt;t:1790000000"));
        assert.ok(!html.includes("</pre>\n"));
    });
});

describe("TXT and JSON export", () => {
    it("TXT resolves mentions, replies and attachments", () => {
        for (const p of ["@Кеша", ":pepe:", "(ответ Алиса)", "📎 cat.png"]) assert.ok(txt.includes(p), p);
        assert.ok(!txt.includes("<@42>"));
    });
    it("JSON has every message", () => {
        assert.equal(json.messageCount, 5);
        assert.equal(json.messages.length, 5);
    });
});

describe("/stats", () => {
    it("counts authors", () => {
        const stats = buildStats(messages);
        assert.match(stats, /Алиса/);
    });
});
