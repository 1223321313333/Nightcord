/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// A sync with Equicord that needs a human says so in an issue, and nobody looks at the run itself. So this runs the
// actual bash of the step that opens the issue, from sync-equicord.yml, with gh and git replaced by scripts that
// write down how they were called.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, it } from "node:test";

import { ROOT } from "./helpers.mjs";

const { load: parseYaml } = createRequire(import.meta.url)("yaml-js");
const { jobs } = parseYaml(readFileSync(join(ROOT, ".github/workflows/sync-equicord.yml"), "utf8"));
const step = (job, name) => jobs[job].steps.find(s => s.name === name);

const BASH = process.platform === "win32"
    ? join(execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim(), "..", "..", "..", "bin", "bash.exe")
    : "bash";

const WARNING = "::warning::The rebranded upstream is not as `pnpm lint:fix` and `pnpm fmt` would leave it (oxlint did not run: no such plugin); expect conflicts in imports";

/**
 * Runs "Leave it for review" as the publish job would.
 * @param {{ conflicts?: boolean, passed?: boolean, sensitive?: string, prepare?: string | null }} options
 * prepare: what prepare-upstream printed in the prepare job, null when the artifact has no such file
 */
function leaveForReview({ conflicts = false, passed = true, sensitive = "", prepare = "rebranded 5 files\nabc123\n" }) {
    const dir = mkdtempSync(join(tmpdir(), "nightcord-sync-")).replace(/\\/g, "/");
    try {
        const bin = `${dir}/bin`;
        mkdirSync(bin);
        mkdirSync(`${dir}/sync`);
        // every argument on its own line: the issue text has several
        writeFileSync(`${bin}/gh`, `#!/bin/sh\nfor arg in "$@"; do printf '%s\\n' "$arg" >> "${dir}/gh.log"; done\n`, { mode: 0o755 });
        // a function, as Git for Windows' bash puts its own git before anything in PATH
        const fakeGit = `git() { echo "$*" >> "${dir}/git.log"; }\n`;

        writeFileSync(`${dir}/sync/resolve.txt`, "Needs a human:\n  UU src/a.ts\n");
        writeFileSync(`${dir}/sync/test.txt`, "tsc: 1 error\n");
        writeFileSync(`${dir}/sensitive.txt`, sensitive);
        if (prepare !== null) writeFileSync(`${dir}/sync/prepare.txt`, prepare);

        const script = step("publish", "Leave it for review").run
            .replace(/\$\{\{\s*github\.repository\s*\}\}/g, "owner/repo")
            .replace(/\/tmp\//g, `${dir}/`);
        assert.doesNotMatch(script, /\$\{\{/, "the test has no value for an expression in the step");

        const result = spawnSync(BASH, ["-e", "-c", fakeGit + script], {
            cwd: dir, encoding: "utf8",
            env: {
                ...process.env,
                PATH: bin + delimiter + process.env.PATH,
                // should the real gh ever get called, it can't reach anything
                GH_TOKEN: "",
                GITHUB_TOKEN: "",
                SHORT: "abcdef123",
                CONFLICTS: String(conflicts),
                PASSED: String(passed),
                GITHUB_STEP_SUMMARY: `${dir}/summary`
            }
        });

        const gh = existsSync(`${dir}/gh.log`) ? readFileSync(`${dir}/gh.log`, "utf8") : "";
        const [, title, body] = gh.match(/^issue\ncreate\n--title\n(.*)\n--body\n([\s\S]*)\n$/) ?? [];
        return {
            status: result.status,
            stderr: result.stderr,
            title,
            body,
            pushes: existsSync(`${dir}/git.log`) ? readFileSync(`${dir}/git.log`, "utf8").trim().split("\n") : []
        };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe("sync workflow: the issue for a sync that needs a human", () => {
    it("keeps what prepare-upstream prints for the publish job", () => {
        const { run } = step("prepare", "Rebrand the new Equicord version");
        assert.match(run, /prepare-upstream\.cjs .* \| tee \/tmp\/sync\/prepare\.txt/);
        assert.match(run, /set -o pipefail/, "without it a failed prepare-upstream is hidden by tee");
    });

    it("lists the conflicts and pushes no branch", () => {
        const run = leaveForReview({ conflicts: true });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(run.title, "Equicord abcdef123: merge conflicts need a human");
        assert.match(run.body, /^ {4} {2}UU src\/a\.ts$/m);
        assert.doesNotMatch(run.body, /While building the rebranded upstream/);
        assert.deepEqual(run.pushes, []);
    });

    it("adds what went wrong while building the rebranded upstream, as text that cannot be markup", () => {
        const run = leaveForReview({ conflicts: true, prepare: `rebranded 5 files\n${WARNING}\nabc123\n` });
        assert.equal(run.status, 0, run.stderr);
        assert.match(run.body, /While building the rebranded upstream:\n\n {4}The rebranded upstream is not as `pnpm lint:fix`.*oxlint did not run: no such plugin/);
        assert.doesNotMatch(run.body, /::warning::|abc123|rebranded 5 files/);
    });

    it("works with an artifact from before prepare-upstream's output was kept", () => {
        const run = leaveForReview({ conflicts: true, prepare: null });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(run.title, "Equicord abcdef123: merge conflicts need a human");
    });

    it("pushes a review branch and names what is sensitive when the merge worked", () => {
        const run = leaveForReview({ sensitive: "src/main/index.ts\n", prepare: `${WARNING}\nabc123\n` });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(run.title, "Equicord abcdef123 changes sensitive files: review before merging");
        assert.match(run.body, /^ {4}src\/main\/index\.ts$/m);
        assert.match(run.body, /compare\/main\.\.\.sync\/equicord-abcdef123\?expand=1/);
        assert.match(run.body, /While building the rebranded upstream:/);
        assert.deepEqual(run.pushes, ["push origin refs/bundle/nc-sync:refs/heads/sync/equicord-abcdef123"]);
    });

    it("shows the end of the checks' output when they failed", () => {
        const run = leaveForReview({ passed: false });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(run.title, "Equicord abcdef123: checks failed");
        assert.match(run.body, /^ {4}tsc: 1 error$/m);
    });
});
