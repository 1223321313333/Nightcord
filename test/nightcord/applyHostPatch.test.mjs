/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// On Windows the host patch has to pick the newest "app-x.y.z" sibling to re-apply itself to after Discord
// updates. isNewer compares those version dir names numerically (so 1.10 beats 1.9, not the other way round),
// which is what decides that; a lexical comparison here would patch or clean the wrong version.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let isNewer, pickNewestVersion;
before(async () => ({ isNewer, pickNewestVersion } = await load("src/main/hostPatchVersion.ts")));

describe("applyHostPatch isNewer", () => {
    it("compares patch versions numerically", () => {
        assert.equal(isNewer("app-1.0.9045", "app-1.0.9044"), true);
        assert.equal(isNewer("app-1.0.9044", "app-1.0.9045"), false);
        assert.equal(isNewer("app-2.0.0", "app-1.9.9"), true);
    });

    it("treats 1.10 as newer than 1.9 (not a string compare)", () => {
        assert.equal(isNewer("app-1.10.0", "app-1.9.0"), true);
        assert.equal(isNewer("app-1.9.0", "app-1.10.0"), false);
    });

    it("is false for equal versions", () => {
        assert.equal(isNewer("app-1.0.9044", "app-1.0.9044"), false);
    });

    it("treats a missing trailing part as zero", () => {
        assert.equal(isNewer("app-1.0.9044.1", "app-1.0.9044"), true);
        assert.equal(isNewer("app-1.0.9044", "app-1.0.9044.1"), false);
    });
});

describe("applyHostPatch pickNewestVersion", () => {
    it("returns the newest sibling that is newer than the current version", () => {
        assert.equal(pickNewestVersion(["app-1.0.9044", "app-1.0.9045"], "app-1.0.9044"), "app-1.0.9045");
        assert.equal(pickNewestVersion(["app-1.0.9045", "app-1.10.0", "app-1.9.0"], "app-1.0.9044"), "app-1.10.0");
    });

    it("returns null when the current version is already the newest", () => {
        assert.equal(pickNewestVersion(["app-1.0.9043", "app-1.0.9044"], "app-1.0.9044"), null);
        assert.equal(pickNewestVersion(["app-1.0.9044"], "app-1.0.9044"), null);
        assert.equal(pickNewestVersion([], "app-1.0.9044"), null);
    });

    it("ignores entries that are not app- versions", () => {
        assert.equal(pickNewestVersion(["modules", "app-1.0.9045", "Update.exe"], "app-1.0.9044"), "app-1.0.9045");
        assert.equal(pickNewestVersion(["modules", "Update.exe"], "app-1.0.9044"), null);
    });
});
