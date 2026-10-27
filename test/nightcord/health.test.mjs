/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// health collects what went wrong while Nightcord loaded (broken patches, failed starts) so NightcordCheck
// can show it. The same patch fails on many modules, so entries are de-duplicated; a patch that later applies
// is retracted. That add/dedup/retract logic is tested here.

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let healthIssues, reportHealthIssue, retractHealthIssue;
before(async () => ({ healthIssues, reportHealthIssue, retractHealthIssue } = await load("src/utils/health.ts")));
beforeEach(() => { healthIssues.length = 0; });

describe("reportHealthIssue", () => {
    it("records an issue with its fields and a timestamp", () => {
        reportHealthIssue("patch-error", "PluginA", "boom");
        assert.equal(healthIssues.length, 1);
        const { kind, plugin, detail, time } = healthIssues[0];
        assert.deepEqual({ kind, plugin, detail }, { kind: "patch-error", plugin: "PluginA", detail: "boom" });
        assert.equal(typeof time, "number");
    });

    it("keeps one entry per distinct problem (dedup)", () => {
        reportHealthIssue("patch-error", "PluginA", "boom");
        reportHealthIssue("patch-error", "PluginA", "boom"); // same -> ignored
        assert.equal(healthIssues.length, 1);
        reportHealthIssue("patch-error", "PluginA", "other");   // different detail
        reportHealthIssue("patch-error", "PluginB", "boom");    // different plugin
        reportHealthIssue("patch-no-effect", "PluginA", "boom"); // different kind
        assert.equal(healthIssues.length, 4);
    });

    it("stringifies an Error to its message and a RegExp like a patch match", () => {
        reportHealthIssue("start-failed", "PluginA", new Error("explode"));
        reportHealthIssue("patch-no-effect", "PluginB", /findThis/g);
        assert.equal(healthIssues[0].detail, "explode");
        assert.equal(healthIssues[1].detail, "/findThis/g");
    });

    it("truncates a very long detail to 300 characters", () => {
        reportHealthIssue("patch-error", "PluginA", "x".repeat(500));
        assert.equal(healthIssues[0].detail.length, 300);
    });
});

describe("retractHealthIssue", () => {
    it("removes a matching issue and leaves others", () => {
        reportHealthIssue("patch-no-effect", "PluginA", "boom");
        reportHealthIssue("patch-no-effect", "PluginB", "boom");
        retractHealthIssue("patch-no-effect", "PluginA", "boom");
        assert.equal(healthIssues.length, 1);
        assert.equal(healthIssues[0].plugin, "PluginB");
    });

    it("does nothing when there is no matching issue", () => {
        reportHealthIssue("patch-error", "PluginA", "boom");
        retractHealthIssue("patch-error", "PluginA", "nope");
        retractHealthIssue("start-failed", "PluginA", "boom");
        assert.equal(healthIssues.length, 1);
    });

    it("retracts a long detail by the same 300-char rule it was stored with", () => {
        reportHealthIssue("patch-error", "PluginA", "y".repeat(500));
        retractHealthIssue("patch-error", "PluginA", "y".repeat(500));
        assert.equal(healthIssues.length, 0);
    });
});
