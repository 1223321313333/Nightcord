/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// resolve-sync settles the package.json conflict that every Equicord sync produces. Taking Equicord's file
// wholesale dropped the dependencies only Nightcord has (qrcode-generator in the a5753f70a sync), so the next
// automatic sync failed to build. These tests lock which side wins for each kind of entry.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import resolveSync from "../../scripts/nightcord/resolve-sync.cjs";
import { ROOT } from "./helpers.mjs";

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

// The script itself, run on a real merge: it reads the conflict stages from git and stages its resolutions.
describe("resolve-sync on a merge in progress", () => {
    const json = value => JSON.stringify(value, null, 4) + "\n";

    /** A repository in the middle of merging `theirs` into `ours`, both made from `base` (null deletes a file) */
    function conflictedMerge(t, base, ours, theirs) {
        const dir = mkdtempSync(join(tmpdir(), "nightcord-sync-"));
        t.after(() => rmSync(dir, { recursive: true, force: true }));
        const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        const commit = (files, message) => {
            for (const [file, content] of Object.entries(files)) {
                if (content === null) rmSync(join(dir, file));
                else writeFileSync(join(dir, file), content);
            }
            git("add", "-A");
            git("commit", "-q", "-m", message);
        };

        git("init", "-q", "-b", "ours");
        for (const [key, value] of [["user.name", "test"], ["user.email", "test@example.invalid"], ["core.autocrlf", "false"]]) git("config", key, value);
        commit(base, "base");
        git("checkout", "-q", "-b", "theirs");
        commit(theirs, "theirs");
        git("checkout", "-q", "ours");
        commit(ours, "ours");
        spawnSync("git", ["merge", "--no-edit", "theirs"], { cwd: dir });

        return {
            run: () => spawnSync(process.execPath, [join(ROOT, "scripts/nightcord/resolve-sync.cjs")], { cwd: dir, encoding: "utf8" }),
            unmerged: () => git("diff", "--name-only", "--diff-filter=U").split("\n").filter(Boolean),
            read: file => readFileSync(join(dir, file), "utf8"),
            exists: file => existsSync(join(dir, file))
        };
    }

    const base = {
        "README.md": "# Equicord\n",
        "package.json": json({ name: "equicord", version: "1.0.0", dependencies: { a: "1.0.0" } }),
        "pnpm-lock.yaml": "lock: base\n",
        "ISSUE_TEMPLATE.md": "template\n"
    };
    const ours = {
        "README.md": "# Nightcord\n",
        "package.json": json({ name: "nightcord", version: "1.0.0", dependencies: { a: "1.0.0", q: "2.0.0" } }),
        "pnpm-lock.yaml": "lock: ours\n",
        "ISSUE_TEMPLATE.md": null
    };
    const theirs = {
        "README.md": "# Equicord 2\n",
        "package.json": json({ name: "equicord", version: "1.1.0", dependencies: { a: "1.1.0" } }),
        "pnpm-lock.yaml": "lock: theirs\n",
        "ISSUE_TEMPLATE.md": "template 2\n"
    };

    it("resolves the conflicts every sync has", t => {
        const merge = conflictedMerge(t, base, ours, theirs);
        assert.deepEqual(merge.unmerged().sort(), ["ISSUE_TEMPLATE.md", "README.md", "package.json", "pnpm-lock.yaml"], "the fixture must conflict");

        const result = merge.run();
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /All conflicts resolved/);
        assert.deepEqual(merge.unmerged(), []);

        assert.equal(merge.read("README.md"), "# Nightcord\n");
        assert.equal(merge.read("pnpm-lock.yaml"), "lock: ours\n");
        assert.equal(merge.exists("ISSUE_TEMPLATE.md"), false, "a file Nightcord deleted stays deleted");
        assert.equal(merge.read("package.json"), json({ name: "nightcord", version: "1.1.0", dependencies: { a: "1.1.0", q: "2.0.0" } }));
    });

    it("leaves other conflicts to a human and says which", t => {
        const merge = conflictedMerge(t, { ...base, "code.ts": "x = 1\n" }, { ...ours, "code.ts": "x = 2\n" }, { ...theirs, "code.ts": "x = 3\n" });

        const result = merge.run();
        assert.equal(result.status, 1);
        assert.match(result.stdout, /Needs a human:\n {2}UU code\.ts/);
        assert.deepEqual(merge.unmerged(), ["code.ts"], "the known conflicts are still resolved");
        assert.equal(merge.read("README.md"), "# Nightcord\n");
    });
});
