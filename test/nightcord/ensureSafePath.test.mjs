/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// ensureSafePath is the gate every file-path IPC from the renderer goes through (themes, QuickCSS): it keeps
// the resolved path inside the allowed base folder, so a malicious or buggy renderer can't read or delete
// arbitrary files via ../ traversal or an absolute path. Security-critical, so it is tested.

import assert from "node:assert/strict";
import { join, normalize } from "node:path";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

const BASE = normalize("/nightcord/themes");
let ensureSafePath;
before(async () => ({ ensureSafePath } = await load("src/main/utils/ensureSafePath.ts")));

describe("ensureSafePath", () => {
    it("allows a plain file and a subfolder inside the base", () => {
        assert.equal(ensureSafePath(BASE, "theme.css"), join(BASE, "theme.css"));
        assert.equal(ensureSafePath(BASE, "sub/theme.css"), join(BASE, "sub", "theme.css"));
    });

    it("allows ../ that stays inside the base (path-aware, not a naive string check)", () => {
        assert.equal(ensureSafePath(BASE, "a/../b.css"), join(BASE, "b.css"));
    });

    it("rejects traversal that escapes the base", () => {
        for (const p of ["../evil", "../../etc/passwd", "sub/../../evil", "..", "../"]) {
            assert.equal(ensureSafePath(BASE, p), null, `${p} must be rejected`);
        }
    });

    it("neutralizes an absolute-looking path by keeping it under the base or rejecting it", () => {
        const r = ensureSafePath(BASE, normalize("/etc/passwd"));
        assert.ok(r === null || r.startsWith(normalize(BASE + "/")), `got ${r}`);
    });

    it("treats the base itself (empty or '.') as allowed", () => {
        assert.equal(ensureSafePath(BASE, ""), normalize(BASE));
        assert.equal(ensureSafePath(BASE, "."), normalize(BASE));
    });
});
