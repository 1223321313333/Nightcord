/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The weekly automatic backup runs only when it is on, a channel and password are configured, and a week
// has passed since the last one. That decision (isAutoBackupDue) is pure and tested here so a change to the
// schedule cannot silently stop backups or make them run too often.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let isAutoBackupDue, WEEK;
before(async () => ({ isAutoBackupDue, WEEK } = await load("src/components/settings/tabs/sync/backup.ts")));

const base = over => ({ enabled: true, channelId: "c", password: "p", lastAt: 0, now: WEEK, ...over });

describe("isAutoBackupDue", () => {
    it("is due when on, configured and a full interval has passed", () => {
        assert.equal(isAutoBackupDue(base()), true);
        assert.equal(isAutoBackupDue(base({ now: WEEK + 1 })), true);
    });

    it("is due exactly at the interval boundary", () => {
        assert.equal(isAutoBackupDue(base({ lastAt: 1000, now: 1000 + WEEK })), true);
    });

    it("is not due before the interval has passed", () => {
        assert.equal(isAutoBackupDue(base({ now: WEEK - 1 })), false);
    });

    it("is not due when off or not fully configured", () => {
        assert.equal(isAutoBackupDue(base({ enabled: false })), false);
        assert.equal(isAutoBackupDue(base({ channelId: null })), false);
        assert.equal(isAutoBackupDue(base({ channelId: "" })), false);
        assert.equal(isAutoBackupDue(base({ password: null })), false);
        assert.equal(isAutoBackupDue(base({ password: "" })), false);
    });

    it("honours a custom interval", () => {
        assert.equal(isAutoBackupDue(base({ lastAt: 0, now: 500, interval: 1000 })), false);
        assert.equal(isAutoBackupDue(base({ lastAt: 0, now: 1000, interval: 1000 })), true);
    });
});
