/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// serializeErrors wraps the updater's IPC methods so the renderer always gets a plain { ok, value|error }
// object instead of a thrown/rejected error (whose prototype would be lost over IPC). Tested here so that
// error contract is locked.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let serializeErrors;
before(async () => ({ serializeErrors } = await load("src/main/updater/common.ts")));

describe("serializeErrors", () => {
    it("wraps a successful result and forwards arguments", async () => {
        assert.deepEqual(await serializeErrors((a, b) => a + b)(2, 3), { ok: true, value: 5 });
        assert.deepEqual(await serializeErrors(async () => "done")(), { ok: true, value: "done" });
    });

    it("turns a thrown Error into a plain object with message/name/stack and custom props", async () => {
        const err = Object.assign(new Error("boom"), { code: 50013 });
        const r = await serializeErrors(() => { throw err; })();
        assert.equal(r.ok, false);
        assert.equal(r.error.message, "boom");
        assert.equal(r.error.name, "Error");
        assert.equal(typeof r.error.stack, "string");
        assert.equal(r.error.code, 50013);
        assert.ok(!(r.error instanceof Error), "the error must be a plain object, not an Error instance");
    });

    it("handles a rejected async function the same way", async () => {
        const r = await serializeErrors(async () => { throw new Error("async boom"); })();
        assert.equal(r.ok, false);
        assert.equal(r.error.message, "async boom");
    });

    it("passes a non-Error thrown value through as-is", async () => {
        const r = await serializeErrors(() => { throw "plain string"; })();
        assert.deepEqual(r, { ok: false, error: "plain string" });
    });
});
