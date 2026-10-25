/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The HTTP updater must pick the right commit from a release name and the right sha256 to verify the
// download against before it overwrites the running install. These parsers decide both, so they are
// tested: a wrong or forged digest string must fail closed (null), never slip through as "good".

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let parseReleaseHash, parsePendingHash, parseAssetDigest, parseChecksumFile, parseRemoteUrl, parseGitChanges;
before(async () => ({ parseReleaseHash, parsePendingHash, parseAssetDigest, parseChecksumFile, parseRemoteUrl, parseGitChanges } =
    await load("src/main/updater/parse.ts")));

const HEX7 = "abc1234";
const HEX40 = "a".repeat(40);
const HEX64 = "0123456789abcdef".repeat(4); // 64 hex chars

describe("updater: parseReleaseHash", () => {
    it("takes the text after the last space", () => {
        assert.equal(parseReleaseHash("Nightcord Devbuild abc1234"), "abc1234");
        assert.equal(parseReleaseHash("Nightcord 1.2.3 deadbeef"), "deadbeef");
    });

    it("returns the whole name when there is no space", () => {
        assert.equal(parseReleaseHash("deadbeef"), "deadbeef");
    });
});

describe("updater: parsePendingHash", () => {
    it("keeps a lower-case git hash of 7 to 40 chars", () => {
        assert.equal(parsePendingHash(HEX7), HEX7);
        assert.equal(parsePendingHash(HEX40), HEX40);
    });

    it("rejects anything that is not a 7-40 char lower-case hex hash", () => {
        for (const bad of ["abc123", "a".repeat(41), "ABCDEF1", "latest", "g".repeat(10), "", "abc 123"]) {
            assert.equal(parsePendingHash(bad), null, `${bad} should be rejected`);
        }
    });
});

describe("updater: parseAssetDigest", () => {
    it("reads a sha256: asset digest, lower-cased", () => {
        assert.equal(parseAssetDigest("sha256:" + HEX64), HEX64);
        assert.equal(parseAssetDigest("sha256:" + HEX64.toUpperCase()), HEX64);
    });

    it("returns null when the digest is missing, a non-string, or a different algorithm", () => {
        for (const bad of [undefined, null, 123, {}, "", "sha1:" + HEX64, HEX64]) {
            assert.equal(parseAssetDigest(bad), null, `${String(bad)} should be null`);
        }
    });
});

describe("updater: parseChecksumFile", () => {
    it("finds the 64-hex checksum in a .sha256 file, lower-cased", () => {
        assert.equal(parseChecksumFile(`${HEX64}  desktop.asar\n`), HEX64);
        assert.equal(parseChecksumFile(`${HEX64.toUpperCase()}  desktop.asar`), HEX64);
    });

    it("returns null when there is no 64-hex checksum", () => {
        assert.equal(parseChecksumFile("no checksum here"), null);
        assert.equal(parseChecksumFile("deadbeef desktop.asar"), null);
        assert.equal(parseChecksumFile(""), null);
    });
});

describe("updater: parseRemoteUrl", () => {
    it("turns an scp-form git remote into an https URL without the .git suffix", () => {
        assert.equal(parseRemoteUrl("git@github.com:user/repo.git\n"), "https://github.com/user/repo");
    });

    it("strips a trailing .git from an https remote", () => {
        assert.equal(parseRemoteUrl("https://github.com/user/repo.git"), "https://github.com/user/repo");
    });

    it("leaves a plain https remote as-is (trimmed)", () => {
        assert.equal(parseRemoteUrl("  https://github.com/user/repo\n"), "https://github.com/user/repo");
    });
});

describe("updater: parseGitChanges", () => {
    it("returns [] for empty or whitespace output", () => {
        assert.deepEqual(parseGitChanges(""), []);
        assert.deepEqual(parseGitChanges("   \n  "), []);
    });

    it("parses author/hash/subject lines", () => {
        assert.deepEqual(parseGitChanges("Alice/abc1234/Fix a crash\nBob/def5678/Add feature"), [
            { author: "Alice", hash: "abc1234", message: "Fix a crash" },
            { author: "Bob", hash: "def5678", message: "Add feature" }
        ]);
    });

    it("keeps slashes that belong to the commit subject", () => {
        assert.deepEqual(parseGitChanges("Carol/0a0a0a0/Fix the a/b/c path"), [
            { author: "Carol", hash: "0a0a0a0", message: "Fix the a/b/c path" }
        ]);
    });
});
