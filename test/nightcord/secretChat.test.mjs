/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// SecretChat's encryption, with two people (Alice and Bob) in one DM

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let c;
let alice, bob, alicePub, bobPub, aliceKey, bobKey;
const DM = "111", A = "1", B = "2";

before(async () => {
    c = await load("src/nightcordplugins/secretChat/crypto.ts");
    [alice, bob] = await Promise.all([c.generateKeyPair(), c.generateKeyPair()]);
    [alicePub, bobPub] = await Promise.all([c.exportPublicKey(alice.publicKey), c.exportPublicKey(bob.publicKey)]);
    aliceKey = await c.deriveChatKey(alice.privateKey, bobPub, DM, [A, B]);
    bobKey = await c.deriveChatKey(bob.privateKey, alicePub, DM, [B, A]);
});

describe("SecretChat encryption", () => {
    it("Bob reads what Alice wrote, and Alice reads her own messages", async () => {
        const content = await c.encryptMessage(aliceKey, "Привет! Встречаемся в 7 🙂", DM, A);
        assert.match(content, /^🔒 \|\|nc1:[A-Za-z0-9+/]+=*\|\|$/);
        assert.ok(!content.includes("Привет"));
        const payload = c.findEncrypted(content);
        assert.equal(await c.decryptMessage(bobKey, payload, DM, A), "Привет! Встречаемся в 7 🙂");
        assert.equal(await c.decryptMessage(aliceKey, payload, DM, A), "Привет! Встречаемся в 7 🙂");
    });

    it("the same text encrypts differently every time", async () => {
        const [x, y] = await Promise.all([c.encryptMessage(aliceKey, "да", DM, A), c.encryptMessage(aliceKey, "да", DM, A)]);
        assert.notEqual(x, y);
    });

    it("refuses a changed message, another chat, another author and a stranger's key", async () => {
        const payload = c.findEncrypted(await c.encryptMessage(aliceKey, "секрет", DM, A));
        const bytes = c.fromBase64(payload);
        bytes[bytes.length - 1] ^= 1;
        await assert.rejects(c.decryptMessage(bobKey, c.toBase64(bytes), DM, A));
        await assert.rejects(c.decryptMessage(bobKey, payload, "222", A), "moved to another chat");
        await assert.rejects(c.decryptMessage(bobKey, payload, DM, B), "passed off as Bob's");

        const eve = await c.generateKeyPair();
        const eveKey = await c.deriveChatKey(eve.privateKey, alicePub, DM, [A, B]);
        await assert.rejects(c.decryptMessage(eveKey, payload, DM, A));
    });

    it("keys are bound to the chat", async () => {
        const otherChat = await c.deriveChatKey(bob.privateKey, alicePub, "999", [A, B]);
        const payload = c.findEncrypted(await c.encryptMessage(aliceKey, "x", DM, A));
        await assert.rejects(c.decryptMessage(otherChat, payload, DM, A));
    });

    it("finds key offers and encrypted texts only in their exact form", () => {
        assert.equal(c.findPublicKey(`🔐 hi ||ncpk1:${alicePub}||`), alicePub);
        assert.equal(c.findPublicKey("||ncpk1:AAAA||"), null, "wrong length");
        assert.equal(c.findPublicKey("ncpk1:" + alicePub), null, "not in a spoiler");
        assert.equal(c.findEncrypted("plain text"), null);
    });

    it("both people get the same safety code, a stranger a different one", async () => {
        const [ab, ba] = await Promise.all([c.safetyCode(alicePub, bobPub), c.safetyCode(bobPub, alicePub)]);
        assert.equal(ab, ba);
        assert.match(ab, /^\d{5} \d{5} \d{5} \d{5}$/);
        const eve = await c.exportPublicKey((await c.generateKeyPair()).publicKey);
        assert.notEqual(await c.safetyCode(alicePub, eve), ab);
    });

    it("knows what fits into one Discord message", async () => {
        assert.ok(c.fitsInOneMessage("а".repeat(700)));
        assert.ok(!c.fitsInOneMessage("а".repeat(800)));
        const longest = "a".repeat(1400);
        assert.ok(c.fitsInOneMessage(longest));
        assert.ok((await c.encryptMessage(aliceKey, longest, DM, A)).length <= c.MAX_CONTENT);
    });
});
