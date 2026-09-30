/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Password encryption of the settings backup kept in the user's own Discord server

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let s;
before(async () => { s = await load("src/utils/syncCrypto.ts"); });

describe("settings backup encryption", () => {
    const json = JSON.stringify({ settings: { plugins: { ClearURLs: { enabled: true } } }, quickCss: ".x{color:red}".repeat(200) });

    it("decrypts with the right password and compresses", async () => {
        const file = await s.encryptBackup(json, "длинный пароль 2026");
        assert.ok(file.length < json.length / 2, "gzip before encryption");
        assert.equal(await s.decryptBackup(file, "длинный пароль 2026"), json);
    });

    it("refuses a wrong password and a changed file", async () => {
        const file = await s.encryptBackup(json, "a");
        await assert.rejects(s.decryptBackup(file, "b"), s.WrongPasswordError);
        const changed = file.slice();
        changed[changed.length - 1] ^= 1;
        await assert.rejects(s.decryptBackup(changed, "a"), s.WrongPasswordError);
        await assert.rejects(s.decryptBackup(new Uint8Array(100), "a"), /not a Nightcord backup/);
    });

    it("never repeats: fresh salt and IV each time", async () => {
        const [x, y] = await Promise.all([s.encryptBackup(json, "p"), s.encryptBackup(json, "p")]);
        assert.notDeepEqual(x.subarray(7, 35), y.subarray(7, 35));
    });
});
