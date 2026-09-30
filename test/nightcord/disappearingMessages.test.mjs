/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// DisappearingMessages deletes messages for real, so the important part is what it never touches:
// other people's messages, other chats and system messages

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const stubs = {
    "@api/DataStore": `const m = globalThis.__store = new Map();
        export const get = async k => m.get(k);
        export const set = async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); };
        export const update = async (k, fn) => { m.set(k, JSON.parse(JSON.stringify(fn(m.get(k))))); };`,
    "@webpack/common": `
        export const React = { createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }), useReducer: () => [0, () => {}], useEffect: () => {}, useState: v => [v, () => {}] };
        export const useState = v => [v, () => {}]; export const useEffect = () => {};
        export const Menu = { MenuItem: "MenuItem", MenuRadioItem: "MenuRadioItem", MenuSeparator: "MenuSeparator", MenuGroup: "MenuGroup", Menu: "Menu" };
        export const Toasts = { show: t => globalThis.__toasts.push(t.message), Type: {}, genId: () => 1 };
        export const showToast = m => globalThis.__toasts.push(m);
        export const Alerts = { show: a => { globalThis.__alert = a; } };
        export const ContextMenuApi = {};
        export const UserStore = { getCurrentUser: () => ({ id: "me" }) };
        export const SnowflakeUtils = { extractTimestamp: id => globalThis.__times[id] ?? Date.now() };
        export const Constants = { Endpoints: { MESSAGE: (c, m) => "/channels/" + c + "/messages/" + m, MESSAGES: c => "/channels/" + c + "/messages" } };
        export const RestAPI = {
            del: async ({ url }) => { globalThis.__deleted.push(url); if (url.endsWith("/gone")) throw { status: 404 }; },
            get: async ({ query }) => ({ body: query.before ? [] : globalThis.__history })
        };
        export const GuildRoleStore = {}; export const ChannelStore = {};`
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const findById = (node, id) => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
        for (const n of node) {
            const f = findById(n, id);
            if (f) return f;
        }
        return null;
    }
    if (node.props?.id === id) return node;
    return findById(node.props?.children, id);
};
const queue = () => (globalThis.__store.get("Nightcord_DisappearingQueue") ?? []).map(q => q.messageId).sort();

describe("DisappearingMessages", () => {
    let plugin;
    const channel = { id: "chan1", isDM: () => true };
    const menu = () => {
        const m = [];
        plugin.contextMenus["channel-context"](m, { channel });
        return m;
    };

    before(async () => {
        Object.assign(globalThis, { __toasts: [], __deleted: [], __times: {}, __history: [] });
        plugin = (await load("src/nightcordplugins/disappearingMessages/index.tsx", stubs)).default;
        plugin.start();
        await sleep(50);
    });
    after(() => plugin.stop());

    it("sets a timer from the chat menu", async () => {
        const hour = findById(menu(), "nc-disappearing-3600000");
        assert.ok(hour && findById(menu(), "nc-disappearing-off") && findById(menu(), "nc-disappearing-bulk"));
        await hour.props.action();
        assert.equal(globalThis.__store.get("Nightcord_DisappearingTimers")?.chan1, 3600000);
        assert.match(menu()[0].props.label, /1 час/);
    });

    it("queues only my own sent messages in chats with a timer", async () => {
        const hoursAgo = Date.now() - 2 * 3600000;
        Object.assign(globalThis.__times, { old: hoursAgo, gone: hoursAgo, fresh: Date.now() });
        const create = (id, channel_id, author, optimistic) => plugin.flux.MESSAGE_CREATE({ message: { id, channel_id, type: 0, author: { id: author } }, optimistic });
        create("old", "chan1", "me");
        create("gone", "chan1", "me");
        create("fresh", "chan1", "me");
        create("theirs", "chan1", "friend");
        create("other", "chan2", "me");
        create("opt", "chan1", "me", true);
        await sleep(100);
        assert.deepEqual(queue(), ["fresh", "gone", "old"]);
    });

    it("after a restart deletes what is due, counts 404 as done and keeps the rest", async () => {
        plugin.stop();
        plugin.start();
        await sleep(3500);
        assert.ok(globalThis.__deleted.includes("/channels/chan1/messages/old"));
        assert.ok(globalThis.__deleted.includes("/channels/chan1/messages/gone"));
        assert.ok(!globalThis.__deleted.some(u => u.endsWith("/fresh")));
        assert.deepEqual(queue(), ["fresh"]);
    });

    it("bulk delete asks first and removes only my normal messages", async () => {
        globalThis.__deleted.length = 0;
        globalThis.__history = [
            { id: "h1", type: 0, author: { id: "me" } },
            { id: "h2", type: 0, author: { id: "friend" } },
            { id: "h3", type: 19, author: { id: "me" } },
            { id: "h4", type: 7, author: { id: "me" } }
        ];
        await findById(menu(), "nc-disappearing-bulk").props.action();
        assert.equal(globalThis.__alert?.confirmText, "Удалить");
        assert.equal(globalThis.__deleted.length, 0, "nothing deleted before confirming");
        await globalThis.__alert.onConfirm();
        await sleep(4000);
        assert.deepEqual(globalThis.__deleted.sort(), ["/channels/chan1/messages/h1", "/channels/chan1/messages/h3"]);
        assert.ok(globalThis.__toasts.some(t => /удалено сообщений: 2/.test(t)));
    });

    it("turns the timer off", async () => {
        await findById(menu(), "nc-disappearing-off").props.action();
        assert.ok(!("chan1" in (globalThis.__store.get("Nightcord_DisappearingTimers") ?? {})));
    });
});
