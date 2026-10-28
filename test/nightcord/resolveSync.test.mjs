/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// resolve-sync settles the package.json conflict that every Equicord sync produces. Taking Equicord's file
// wholesale dropped the dependencies only Nightcord has (qrcode-generator in the a5753f70a sync), so the next
// automatic sync failed to build. These tests lock which side wins for each kind of entry.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import resolveSync from "../../scripts/nightcord/resolve-sync.cjs";

const { mergePackageJson } = resolveSync;

describe("resolve-sync mergePackageJson", () => {
    it("keeps Nightcord's metadata and takes everything else from Equicord", () => {
        const base = { name: "equicord", version: "1.0.0", description: "old", scripts: { build: "a" } };
        const ours = { name: "nightcord", version: "1.0.0", description: "Nightcord", homepage: "https://n/", author: "N", scripts: { build: "a" } };
        const theirs = { name: "equicord", version: "1.1.0", description: "new", homepage: "https://e/", author: "E", scripts: { build: "b" } };
        assert.deepEqual(mergePackageJson(base, ours, theirs), {
            name: "nightcord", version: "1.1.0", description: "Nightcord", homepage: "https://n/", author: "N", scripts: { build: "b" }
        });
    });

    it("keeps a dependency only Nightcord added, sorted among Equicord's", () => {
        const merged = mergePackageJson(
            { dependencies: { a: "1", z: "1" } },
            { dependencies: { a: "1", m: "2", z: "1" } },
            { dependencies: { a: "1.1", z: "1.1" } }
        );
        assert.deepEqual(merged.dependencies, { a: "1.1", m: "2", z: "1.1" });
        assert.deepEqual(Object.keys(merged.dependencies), ["a", "m", "z"]);
    });

    it("drops a dependency Equicord removed", () => {
        const merged = mergePackageJson(
            { dependencies: { a: "1", old: "1" } },
            { dependencies: { a: "1", old: "1" } },
            { dependencies: { a: "1" } }
        );
        assert.deepEqual(merged.dependencies, { a: "1" });
    });

    it("takes Equicord's version of a shared dependency, even one Nightcord bumped", () => {
        // some packages break the build when Nightcord runs ahead of Equicord, so Equicord's version wins
        const merged = mergePackageJson(
            { devDependencies: { typescript: "^5.0.0" } },
            { devDependencies: { typescript: "^7.0.0" } },
            { devDependencies: { typescript: "^6.0.3" } }
        );
        assert.deepEqual(merged.devDependencies, { typescript: "^6.0.3" });
    });

    it("takes Equicord's version when both sides added the same dependency", () => {
        const merged = mergePackageJson({}, { dependencies: { x: "1.0.0" } }, { dependencies: { x: "1.2.0" } });
        assert.deepEqual(merged.dependencies, { x: "1.2.0" });
    });

    it("inserts without reordering Equicord's entries", () => {
        const merged = mergePackageJson(
            { dependencies: { a: "1", x: "1", b: "1", z: "1" } },
            { dependencies: { a: "1", c: "1", x: "1", b: "1", z: "1" } },
            { dependencies: { a: "1", x: "1", b: "1", z: "1" } }
        );
        assert.deepEqual(Object.keys(merged.dependencies), ["a", "c", "x", "b", "z"]);
    });

    it("creates a dependency section Equicord does not have", () => {
        const merged = mergePackageJson({}, { optionalDependencies: { fsevents: "2" } }, { dependencies: { a: "1" } });
        assert.deepEqual(merged.optionalDependencies, { fsevents: "2" });
        assert.deepEqual(merged.dependencies, { a: "1" });
    });

    it("does not modify its inputs", () => {
        const base = { dependencies: { a: "1" } };
        const ours = { name: "nightcord", dependencies: { a: "1", n: "1" } };
        const theirs = { name: "equicord", dependencies: { a: "2" } };
        const before = structuredClone([base, ours, theirs]);
        mergePackageJson(base, ours, theirs);
        assert.deepEqual([base, ours, theirs], before);
    });

    it("keeps qrcode-generator through the a5753f70a sync and restores Equicord's order", () => {
        const discordTypes = "link:packages/discord-types";
        const base = {
            dependencies: { "native-file-system-adapter": "^3.0.1", "virtual-merge": "^1.0.1" },
            devDependencies: { "@electron/asar": "^4.0.0", "@types/yazl": "^3.3.1", "@nightcord/discord-types": discordTypes, "diff": "^8.0.0" }
        };
        // `pnpm add` sorted Nightcord's devDependencies, moving discord-types up
        const ours = {
            dependencies: { "native-file-system-adapter": "^3.0.1", "qrcode-generator": "^2.0.4", "virtual-merge": "^1.0.1" },
            devDependencies: { "@electron/asar": "^4.0.0", "@nightcord/discord-types": discordTypes, "@types/yazl": "^3.3.1", "diff": "^8.0.0" }
        };
        const theirs = {
            dependencies: { "native-file-system-adapter": "^3.0.1", "virtual-merge": "^1.0.1" },
            devDependencies: { "@electron/asar": "^4.2.0", "@types/yazl": "^3.3.1", "@nightcord/discord-types": discordTypes, "diff": "^9.0.0" }
        };
        const merged = mergePackageJson(base, ours, theirs);
        assert.deepEqual(Object.keys(merged.dependencies), ["native-file-system-adapter", "qrcode-generator", "virtual-merge"]);
        assert.equal(merged.dependencies["qrcode-generator"], "^2.0.4");
        assert.deepEqual(merged.devDependencies, theirs.devDependencies);
        assert.deepEqual(Object.keys(merged.devDependencies), Object.keys(theirs.devDependencies));
    });
});
