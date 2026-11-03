/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// update-deps decides what the weekly dependency update ships without anyone reading it, so these tests lock what it
// reads out of the lockfiles and when it asks for a person instead.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import updateDeps from "../../scripts/nightcord/update-deps.cjs";
import { ROOT } from "./helpers.mjs";

const { pnpmLockEntries, bunLockEntries, splitEntry, diffEntries, describeDiff, holdReasons, pnpmPolicy, seriousAdvisories, COOLDOWN_DAYS } = updateDeps;

const PNPM_LOCK = `---
lockfileVersion: '9.0'

importers:

  .:
    configDependencies: {}
    packageManagerDependencies:
      '@pnpm/exe':
        specifier: 12.15.0
        version: 12.15.0

packages:

  '@pnpm/exe@12.15.0':
    resolution: {integrity: sha512-a}

snapshots:

  '@pnpm/exe@12.15.0': {}

---
lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      fflate:
        specifier: ^0.8.3
        version: 0.8.3

packages:

  '@babel/code-frame@7.29.7':
    resolution: {integrity: sha512-b}
    engines: {node: '>=6.9.0'}

  fflate@0.8.3:
    resolution: {integrity: sha512-c}

  gifenc@https://codeload.github.com/mattdesl/gifenc/tar.gz/64842fca:
    resolution: {tarball: https://codeload.github.com/mattdesl/gifenc/tar.gz/64842fca}

  semver@6.3.1:
    resolution: {integrity: sha512-d}

  semver@7.8.5:
    resolution: {integrity: sha512-e}

snapshots:

  fflate@0.8.3: {}
`;

const BUN_LOCK = `{
  "lockfileVersion": 2,
  "workspaces": {
    "": {
      "name": "nightcord-desktop",
      "dependencies": {
        "ws": "^8.21.3",
      },
    },
    "packages/libvesktop": {
      "name": "libvesktop",
    },
  },
  "trustedDependencies": [
    "electron",
  ],
  "packages": {
    "@types/ws": ["@types/ws@8.18.1", "", { "dependencies": { "@types/node": "*" } }, "sha512-a"],

    "electron": ["electron@43.8.4", "", { "bin": { "electron": "cli.js" } }, "sha512-b"],

    "libvesktop": ["libvesktop@file:packages/libvesktop", { "devDependencies": { "node-addon-api": "^8.9.2" } }],

    "semver": ["semver@7.8.5", "", {}, "sha512-c"],

    "@electron/get/semver": ["semver@6.3.1", "", {}, "sha512-d"],

    "other/semver": ["semver@6.3.1", "", {}, "sha512-d"],
  }
}
`;

describe("update-deps lockfile reading", () => {
    it("reads the project's packages out of a pnpm lockfile, not pnpm's own", () => {
        assert.deepEqual(pnpmLockEntries(PNPM_LOCK), [
            "@babel/code-frame@7.29.7",
            "fflate@0.8.3",
            "gifenc@https://codeload.github.com/mattdesl/gifenc/tar.gz/64842fca",
            "semver@6.3.1",
            "semver@7.8.5"
        ]);
    });

    it("reads a bun lockfile, each version once", () => {
        assert.deepEqual(bunLockEntries(BUN_LOCK), [
            "@types/ws@8.18.1",
            "electron@43.8.4",
            "libvesktop@file:packages/libvesktop",
            "semver@7.8.5",
            "semver@6.3.1"
        ]);
    });

    it("finds the packages of the real lockfile", () => {
        const entries = pnpmLockEntries(readFileSync(join(ROOT, "pnpm-lock.yaml"), "utf8"));
        assert.ok(entries.length > 300, `only ${entries.length} entries: did the lockfile format change?`);
        assert.ok(entries.every(entry => splitEntry(entry).name && splitEntry(entry).version), "an entry without a name or version");
        assert.ok(!entries.some(entry => entry.startsWith("@pnpm/exe")), "pnpm's own document was read");
    });

    it("splits scoped names and URLs", () => {
        assert.deepEqual(splitEntry("@scope/name@1.2.3"), { name: "@scope/name", version: "1.2.3" });
        assert.deepEqual(splitEntry("name@1.2.3"), { name: "name", version: "1.2.3" });
        assert.deepEqual(splitEntry("gifenc@https://x.y/a@b"), { name: "gifenc", version: "https://x.y/a@b" });
    });
});

describe("update-deps changes", () => {
    const diff = diffEntries(
        ["a@1.0.0", "gone@1.0.0", "same@1.0.0", "two@1.0.0", "two@2.0.0", "git@https://x.y/a"],
        ["a@1.0.1", "fresh@3.0.0", "same@1.0.0", "two@1.0.0", "two@2.1.0", "git@https://x.y/a", "other@https://x.y/b"]
    );

    it("tells changed, new and removed packages apart, and leaves out the rest", () => {
        assert.deepEqual(diff.changed, [
            { name: "a", from: ["1.0.0"], to: ["1.0.1"] },
            { name: "two", from: ["2.0.0"], to: ["2.1.0"] }
        ]);
        assert.deepEqual(diff.added, ["fresh", "other"]);
        assert.deepEqual(diff.removed, ["gone"]);
    });

    it("only flags what newly comes from outside the registry", () => {
        assert.deepEqual(diff.notFromRegistry, ["other@https://x.y/b"]);
    });

    it("describes the changes", () => {
        assert.deepEqual(describeDiff(diff, ["fresh@3.0.0", "other@https://x.y/b"]), [
            "- a 1.0.0 → 1.0.1",
            "- two 2.0.0 → 2.1.0",
            "- fresh 3.0.0 (new)",
            "- other https://x.y/b (new)",
            "- gone (no longer needed)"
        ]);
        const lost = diffEntries(["a@1.0.0", "a@2.0.0"], ["a@2.0.0"]);
        assert.deepEqual(describeDiff(lost, ["a@2.0.0"]), ["- a 1.0.0 → (no longer needed)"]);
        const copy = diffEntries(["a@2.0.0"], ["a@1.0.0", "a@2.0.0"]);
        assert.deepEqual(describeDiff(copy, ["a@1.0.0", "a@2.0.0"]), ["- a (another copy) → 1.0.0"]);
    });

    it("says nothing when nothing changed", () => {
        const same = diffEntries(["a@1.0.0"], ["a@1.0.0"]);
        assert.deepEqual(describeDiff(same, ["a@1.0.0"]), []);
    });
});

describe("update-deps reasons to wait for a person", () => {
    const NOW = Date.parse("2026-11-04T00:00:00Z");
    const known = date => async () => new Date(date);
    const withAdded = (...added) => ({ added, removed: [], changed: [], notFromRegistry: [] });

    it("lets version bumps and long-existing new packages through", async () => {
        assert.deepEqual(await holdReasons({ ...withAdded(), changed: [{ name: "a", from: ["1"], to: ["2"] }] }, known("2020-01-01"), NOW), []);
        assert.deepEqual(await holdReasons(withAdded("old"), known("2026-10-04T00:00:00Z"), NOW), []);
    });

    it("holds a package that has not existed for a month", async () => {
        const [reason] = await holdReasons(withAdded("plain-crypto"), known("2026-10-20T00:00:00Z"), NOW);
        assert.match(reason, /plain-crypto is new here and only exists since 2026-10-20/);
    });

    it("holds a new package npm says nothing about, rather than letting it through", async () => {
        const [reason] = await holdReasons(withAdded("x"), () => Promise.reject(new Error("HTTP 404")), NOW);
        assert.match(reason, /x is new here/);
    });

    it("holds anything newly coming from outside the registry", async () => {
        const reasons = await holdReasons({ ...withAdded(), notFromRegistry: ["a@https://x.y/a"] }, known("2020-01-01"), NOW);
        assert.deepEqual(reasons, ["a@https://x.y/a does not come from the npm registry"]);
    });
});

describe("update-deps policy for pnpm", () => {
    const env = pnpmPolicy(["a@1.0.0", "@scope/b@2.0.0-beta.4", "gifenc@https://x.y/a"]);

    it("waits a week for new versions, in the minutes pnpm counts in", () => {
        assert.equal(COOLDOWN_DAYS, 7);
        assert.equal(env.PNPM_CONFIG_MINIMUM_RELEASE_AGE, "10080");
    });

    it("refuses versions that lost their publishing guarantees", () => {
        assert.equal(env.PNPM_CONFIG_TRUST_POLICY, "no-downgrade");
    });

    it("exempts only what is already locked, at exact versions, which is all pnpm accepts there", () => {
        assert.deepEqual(JSON.parse(env.PNPM_CONFIG_MINIMUM_RELEASE_AGE_EXCLUDE), ["a@1.0.0", "@scope/b@2.0.0-beta.4"]);
        assert.deepEqual(JSON.parse(env.PNPM_CONFIG_TRUST_POLICY_EXCLUDE), ["a@1.0.0", "@scope/b@2.0.0-beta.4"]);
    });
});

describe("update-deps audit", () => {
    const report = advisories => "[WARN] a warning first\n" + JSON.stringify({ advisories });

    it("keeps high and critical advisories", () => {
        assert.deepEqual(seriousAdvisories(report({
            1: { module_name: "low", severity: "low", title: "t", url: "u" },
            2: { module_name: "moderate", severity: "moderate", title: "t", url: "u" },
            3: { module_name: "high", severity: "high", title: "t", url: "u" },
            4: { module_name: "critical", severity: "critical", title: "t", url: "u" }
        })), ["critical: t (critical, u)", "high: t (high, u)"]);
    });

    it("has nothing to say about a clean report", () => {
        assert.deepEqual(seriousAdvisories(report({})), []);
    });
});
