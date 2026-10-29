/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// prepare-upstream builds the commit every sync merges, in the sync workflow and by hand. Run here in a scratch
// repository on a fake Equicord commit: the result must have the previous upstream and the Equicord commit as
// parents, the Upstream: line the workflow reads, the Nightcord name, and Equicord's workflows as they were before.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import { ROOT } from "./helpers.mjs";

let dir, git, base, equicord, result, run;
before(() => {
    dir = mkdtempSync(join(tmpdir(), "nightcord-prepare-"));
    git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const write = files => {
        for (const [file, content] of Object.entries(files)) {
            mkdirSync(dirname(join(dir, file)), { recursive: true });
            writeFileSync(join(dir, file), content);
        }
    };

    git("init", "-q", "-b", "main");
    for (const [key, value] of [["user.name", "test"], ["user.email", "test@example.invalid"], ["core.autocrlf", "false"]]) git("config", key, value);

    write({ ".github/workflows/ci.yml": "kept from the last sync\n", "src/a.ts": "export const name = \"Nightcord\";\n" });
    git("add", "-A");
    git("commit", "-q", "-m", "previous upstream");
    base = git("rev-parse", "HEAD");

    git("checkout", "-q", "--orphan", "equicord");
    git("rm", "-rqf", ".");
    write({
        ".github/workflows/ci.yml": "changed by Equicord\n",
        ".github/workflows/new.yml": "added by Equicord\n",
        "src/a.ts": "export const name = \"Equicord\";\n"
    });
    git("add", "-A");
    git("commit", "-q", "-m", "Equicord");
    equicord = git("rev-parse", "HEAD");
    git("checkout", "-q", "main");

    run = spawnSync(process.execPath, [join(ROOT, "scripts/nightcord/prepare-upstream.cjs"), equicord, base, "nc-upstream"], {
        cwd: dir, encoding: "utf8", env: { ...process.env, NIGHTCORD_PREPARE_ROOT: dir }
    });
    result = run.stdout.trim().split("\n").at(-1);
});
after(() => rmSync(dir, { recursive: true, force: true }));

describe("prepare-upstream", () => {
    it("succeeds and points the branch at the new commit", () => {
        assert.equal(run.status, 0, run.stdout + run.stderr);
        assert.equal(git("rev-parse", "nc-upstream"), result);
    });

    it("has the previous upstream and the Equicord commit as parents, and the line the workflow reads", () => {
        assert.deepEqual(git("log", "-1", "--format=%P", result).split(" "), [base, equicord]);
        assert.equal(git("log", "-1", "--format=%B", result), `Equicord ${equicord.slice(0, 9)} rebranded to Nightcord\n\nUpstream: ${equicord}`);
    });

    it("rebrands Equicord's code", () => {
        assert.equal(git("show", `${result}:src/a.ts`), "export const name = \"Nightcord\";");
    });

    it("keeps Equicord's workflows as they were at the last sync", () => {
        assert.equal(git("show", `${result}:.github/workflows/ci.yml`), "kept from the last sync");
        assert.throws(() => git("cat-file", "-e", `${result}:.github/workflows/new.yml`), "a new Equicord workflow got in");
    });

    it("cleans up after itself", () => {
        assert.equal(existsSync(join(dir, ".upstream-work")), false);
        assert.equal(git("worktree", "list").split("\n").length, 1);
        assert.match(readFileSync(join(dir, ".git", "info", "exclude"), "utf8"), /^\/\.upstream-work\/$/m);
        assert.equal(git("status", "--porcelain"), "", "the checkout must be left as it was");
    });
});
