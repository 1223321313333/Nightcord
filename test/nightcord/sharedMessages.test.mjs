/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Shared message helpers used by ChatStats, ChatExport and LocalSearch: turning Discord's raw data into
// readable text, avatar/emoji URLs and friendly error messages. All pure, so they are unit tested here.
// Inputs that would reach Discord's stores (bare role/channel/user mentions) are avoided; mentions are
// given through the context map instead.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let m;
before(async () => (m = await load("src/nightcordplugins/_shared/messages.ts")));

describe("displayName", () => {
    it("prefers the global name, then the username, then a fallback", () => {
        assert.equal(m.displayName({ global_name: "Alice", username: "al" }), "Alice");
        assert.equal(m.displayName({ username: "al" }), "al");
        assert.equal(m.displayName(null), "неизвестный");
        assert.equal(m.displayName({}), "неизвестный");
    });
});

describe("avatarUrl", () => {
    it("uses the custom avatar, gif for animated ones", () => {
        assert.equal(m.avatarUrl({ id: "1", avatar: "abc" }), "https://cdn.discordapp.com/avatars/1/abc.png?size=64");
        assert.equal(m.avatarUrl({ id: "1", avatar: "a_xyz" }, 128), "https://cdn.discordapp.com/avatars/1/a_xyz.gif?size=128");
    });

    it("falls back to the default avatar by (id >> 22) % 6", () => {
        assert.equal(m.avatarUrl({ id: "0" }), "https://cdn.discordapp.com/embed/avatars/0.png");
        assert.equal(m.avatarUrl({ id: "4194304" }), "https://cdn.discordapp.com/embed/avatars/1.png"); // 2^22 >> 22 = 1
        assert.equal(m.avatarUrl({ id: "not-a-snowflake" }), "https://cdn.discordapp.com/embed/avatars/0.png");
    });
});

describe("emojiUrl", () => {
    it("picks gif for animated emoji and png otherwise", () => {
        assert.equal(m.emojiUrl("123", true), "https://cdn.discordapp.com/emojis/123.gif?size=48");
        assert.equal(m.emojiUrl("123", false), "https://cdn.discordapp.com/emojis/123.png?size=48");
    });
});

describe("describeFetchError", () => {
    it("explains the common failures in Russian", () => {
        assert.match(m.describeFetchError({ status: 403 }), /нет доступа/);
        assert.match(m.describeFetchError({ body: { code: 50001 } }), /нет доступа/);
        assert.match(m.describeFetchError({ body: { code: 50013 } }), /нет доступа/);
        assert.match(m.describeFetchError({ status: 429 }), /слишком много запросов/);
        assert.match(m.describeFetchError({}), /нет связи с Discord/);
        assert.match(m.describeFetchError({ status: 500 }), /ошибкой 500/);
    });
});

describe("escapeHtml", () => {
    it("escapes the five HTML-significant characters", () => {
        assert.equal(m.escapeHtml(`<b>&"'`), "&lt;b&gt;&amp;&quot;&#39;");
        assert.equal(m.escapeHtml("plain text"), "plain text");
    });
});

describe("markupToText", () => {
    it("turns custom emoji and slash commands into readable text", () => {
        assert.equal(m.markupToText("hi <:smile:123> and <a:party:9>"), "hi :smile: and :party:");
        assert.equal(m.markupToText("use </help:1> now"), "use /help now");
    });

    it("resolves user mentions from the context map", () => {
        assert.equal(m.markupToText("hey <@42>!", { users: new Map([["42", "Alice"]]) }), "hey @Alice!");
        assert.equal(m.markupToText("hey <@!42>", { users: new Map([["42", "Alice"]]) }), "hey @Alice");
    });
});

describe("markupToHtml", () => {
    it("renders basic markdown", () => {
        assert.match(m.markupToHtml("**bold**"), /<b>bold<\/b>/);
        assert.match(m.markupToHtml("`code`"), /<code>code<\/code>/);
        assert.match(m.markupToHtml("||secret||"), /<span class="spoiler">secret<\/span>/);
    });

    it("escapes raw HTML so it cannot inject markup", () => {
        const html = m.markupToHtml("<script>alert(1)</script>");
        assert.ok(!html.includes("<script>"), html);
        assert.ok(html.includes("&lt;script&gt;"), html);
    });

    it("renders every inline style, including nested bold+italic", () => {
        assert.match(m.markupToHtml("***hi***"), /<b><i>hi<\/i><\/b>/);
        assert.match(m.markupToHtml("__u__"), /<u>u<\/u>/);
        assert.match(m.markupToHtml("*it*"), /<i>it<\/i>/);
        assert.match(m.markupToHtml("_it_"), /<i>it<\/i>/);
        assert.match(m.markupToHtml("~~s~~"), /<s>s<\/s>/);
    });

    it("renders block elements at the start of a line", () => {
        assert.match(m.markupToHtml("# Title"), /<div class="h">Title<\/div>/);
        assert.match(m.markupToHtml("### Title"), /<div class="h">Title<\/div>/);
        assert.match(m.markupToHtml("-# small print"), /<div class="sub">small print<\/div>/);
        assert.match(m.markupToHtml("> quoted"), /<div class="quote">quoted<\/div>/);
    });

    it("renders a fenced code block with the language stripped and the body escaped", () => {
        const html = m.markupToHtml("```js\nconst x = \"<b>\";\n```");
        assert.ok(html.includes("<pre><code>const x = &quot;&lt;b&gt;&quot;;\n</code></pre>"), html);
        assert.ok(!html.includes("js\n"), "the language tag must not appear in the output");
    });

    it("does not format or unescape the inside of inline code", () => {
        const html = m.markupToHtml("`**x** <b>`");
        assert.ok(html.includes("<code>**x** &lt;b&gt;</code>"), html);
        assert.ok(!html.includes("<b>x</b>"), "markdown inside code must stay literal");
    });

    it("links a masked http(s) link but refuses a javascript: one", () => {
        assert.match(m.markupToHtml("see [here](https://example.com/p)"), /<a href="https:\/\/example\.com\/p" rel="noreferrer">here<\/a>/);
        const evil = m.markupToHtml("[click](javascript:alert(1))");
        assert.ok(!/href="javascript:/i.test(evil), evil);
    });

    it("turns a bare http(s) link into an anchor", () => {
        assert.match(m.markupToHtml("visit https://example.com/x"), /<a href="https:\/\/example\.com\/x" rel="noreferrer">https:\/\/example\.com\/x<\/a>/);
    });
});

describe("mentionNames", () => {
    it("maps mentioned user ids to their display names", () => {
        const map = m.mentionNames({ mentions: [{ id: "1", global_name: "Al" }, { id: "2", username: "bob" }] });
        assert.deepEqual([...map], [["1", "Al"], ["2", "bob"]]);
    });

    it("is empty when there are no mentions", () => {
        assert.equal(m.mentionNames({}).size, 0);
    });
});
