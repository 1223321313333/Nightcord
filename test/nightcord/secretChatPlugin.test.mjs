/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// SecretChat must never send plain text in a chat where encryption is on

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const stubs = {
    "@api/DataStore": `const m = globalThis.__store = new Map(); export const get = async k => m.get(k); export const set = async (k, v) => { m.set(k, v); };`,
    "@webpack/common": `
        export const React = { createElement: () => null, useReducer: () => [0, () => {}], useEffect: () => {}, useState: v => [v, () => {}] };
        export const Menu = {}; export const ContextMenuApi = {}; export const Parser = { parse: t => t };
        export const Alerts = { show: () => {} };
        export const Toasts = { show: t => globalThis.__toasts.push(t.message), Type: {}, genId: () => 1 };
        export const UserStore = { getCurrentUser: () => ({ id: "me" }) };
        const dm = id => ({ id, isDM: () => true, getRecipientId: () => "friend" });
        export const ChannelStore = { getChannel: id => id === "group" ? { id, isDM: () => false } : dm(id) };`,
    "@utils/discord": `export const sendMessage = async (c, m) => globalThis.__sent.push(m.content);`
};

let plugin, sc, crypto, friend;
const channel = { id: "dm1", isDM: () => true, getRecipientId: () => "friend" };

before(async () => {
    globalThis.__toasts = [];
    globalThis.__sent = [];
    sc = await load("src/nightcordplugins/secretChat/index.tsx", stubs);
    crypto = await load("src/nightcordplugins/secretChat/crypto.ts");
    plugin = sc.default;
    plugin.start();
    friend = await crypto.generateKeyPair();
});

describe("SecretChat sending", () => {
    it("leaves chats without encryption alone", async () => {
        const msg = { content: "обычное сообщение" };
        assert.equal(await sc.encryptOutgoing("dm1", msg), undefined);
        assert.equal(msg.content, "обычное сообщение");
    });

    it("with encryption on but no key from the other person, cancels instead of sending plain text", async () => {
        await sc.setEnabled("dm1", true);
        const msg = { content: "секрет" };
        assert.deepEqual(await sc.encryptOutgoing("dm1", msg), { cancel: true });
    });

    it("encrypts once the other person's key arrived, and they can read it", async () => {
        const friendPub = await crypto.exportPublicKey(friend.publicKey);
        await sc.learnKey({ id: "k1", author: { id: "friend" }, content: `🔐 hi ||ncpk1:${friendPub}||` }, channel);

        const msg = { content: "секрет" };
        assert.equal(await sc.encryptOutgoing("dm1", msg), undefined);
        assert.ok(!msg.content.includes("секрет"));

        // the friend derives the same key from their private key and my public key, and reads it
        const myPub = globalThis.__store.get("Nightcord_SecretChat").publicKey;
        const key = await crypto.deriveChatKey(friend.privateKey, myPub, "dm1", ["friend", "me"]);
        assert.equal(await crypto.decryptMessage(key, crypto.findEncrypted(msg.content), "dm1", "me"), "секрет");
    });

    it("does not touch its own key offers", async () => {
        const msg = { content: "🔐 ... ||ncpk1:AAAA||" };
        assert.equal(await sc.encryptOutgoing("dm1", msg), undefined);
        assert.equal(msg.content, "🔐 ... ||ncpk1:AAAA||");
    });

    it("a different key from the other person stops encryption until the user accepts it", async () => {
        const other = await crypto.exportPublicKey((await crypto.generateKeyPair()).publicKey);
        await sc.learnKey({ id: "k2", author: { id: "friend" }, content: `||ncpk1:${other}||` }, channel);
        assert.deepEqual(await sc.encryptOutgoing("dm1", { content: "x" }), { cancel: true });
        await sc.acceptChangedKey("friend");
        const msg = { content: "x" };
        assert.equal(await sc.encryptOutgoing("dm1", msg), undefined);
        assert.match(msg.content, /^🔒 \|\|nc1:/);
    });

    it("ignores keys that someone other than the DM partner posts", async () => {
        const stranger = await crypto.exportPublicKey((await crypto.generateKeyPair()).publicKey);
        await sc.learnKey({ id: "k3", author: { id: "me" }, content: `||ncpk1:${stranger}||` }, channel);
        const msg = { content: "x" };
        assert.equal(await sc.encryptOutgoing("dm1", msg), undefined, "still uses the accepted key, no change pending");
    });

    it("cancels a message too long to encrypt", async () => {
        assert.deepEqual(await sc.encryptOutgoing("dm1", { content: "я".repeat(1500) }), { cancel: true });
    });

    it("renders a box for encrypted messages", async () => {
        const msg = { content: "встреча в 7" };
        await sc.encryptOutgoing("dm1", msg);
        const accessory = plugin.renderMessageAccessory({ message: { id: "m1", author: { id: "me" }, content: msg.content }, channel });
        assert.ok(accessory, "renders something for encrypted messages");
    });
});
