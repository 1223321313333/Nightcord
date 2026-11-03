/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The publish job of the weekly dependency update pushes to main and starts releases with nobody watching, and a real
// run only ever goes down one of its paths. So this runs the job's actual bash from update-deps.yml against a scratch
// repository, once for each way a run can end, with gh replaced by a script that writes down how it was called.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, it } from "node:test";

import { ROOT } from "./helpers.mjs";

const { load: parseYaml } = createRequire(import.meta.url)("yaml-js");
const publish = parseYaml(readFileSync(join(ROOT, ".github/workflows/update-deps.yml"), "utf8")).jobs.publish;
const STEPS = publish.steps.filter(step => step.run);

const forwardSlashes = path => path.replace(/\\/g, "/");
const BASH = process.platform === "win32"
    ? join(execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim(), "..", "..", "..", "bin", "bash.exe")
    : "bash";
const HAS_JQ = spawnSync("jq", ["--version"]).status === 0;

// The few expressions the job uses, where jq is not installed. CI has the real one.
const JQ_STUB = `
const fs = require("fs");
const [expression, file] = process.argv.slice(2).filter(arg => arg !== "-r");
const report = JSON.parse(fs.readFileSync(file, "utf8"));
const print = value => process.stdout.write((typeof value === "string" ? value : JSON.stringify(value)) + "\\n");
const path = expression.match(/^\\.(\\w+)\\.(\\w+)(\\[\\])?$/);
if (path) path[3] ? report[path[1]][path[2]].forEach(print) : print(report[path[1]][path[2]]);
else if (expression === ".advisories | length") print(report.advisories.length);
else if (expression.startsWith(".advisories[]")) report.advisories.forEach(advisory => print("- " + advisory));
else process.exit(9);
`;

function runPublish({
    root = false, desktop = false, rootHold = [], rootCheck, desktopCheck, clientChanged = false, appChanged = false,
    electronChanged = false, advisories = [], existingIssue = "", dryRun = false, mainMoved = false, wrongFile = false
}) {
    const dir = forwardSlashes(mkdtempSync(join(tmpdir(), "nightcord-publish-")));
    try {
        const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
        const identify = cwd => { for (const [key, value] of [["user.name", "test"], ["user.email", "test@example.invalid"], ["core.autocrlf", "false"]]) git(cwd, "config", key, value); };
        const [origin, work, deps, bin] = ["origin.git", "work", "deps", "bin"].map(name => `${dir}/${name}`);
        mkdirSync(deps);
        mkdirSync(bin);

        git(dir, "init", "-q", "--bare", "-b", "main", origin);
        git(dir, "clone", "-q", origin, work);
        identify(work);
        git(work, "checkout", "-q", "-b", "main");
        mkdirSync(`${work}/desktop`);
        writeFileSync(`${work}/pnpm-lock.yaml`, "old root\n");
        writeFileSync(`${work}/desktop/bun.lock`, "old desktop\n");
        git(work, "add", "-A");
        git(work, "commit", "-q", "-m", "start");
        git(work, "push", "-q", "origin", "main");
        const base = git(work, "rev-parse", "HEAD");

        if (mainMoved) {
            git(dir, "clone", "-q", origin, `${dir}/other`);
            identify(`${dir}/other`);
            git(`${dir}/other`, "commit", "-q", "--allow-empty", "-m", "someone else");
            git(`${dir}/other`, "push", "-q", "origin", "main");
        }

        writeFileSync(`${deps}/pnpm-lock.yaml`, "new root\n");
        writeFileSync(`${deps}/bun.lock`, "new desktop\n");
        writeFileSync(`${deps}/report.json`, JSON.stringify({
            root: { changed: root, message: "Update dependencies\n\n- a 1 → 2\n", lines: root ? ["- a 1 → 2"] : [], hold: rootHold },
            desktop: { changed: desktop, message: "Update Nightcord Desktop's dependencies\n\n- b 1 → 2\n", lines: desktop ? ["- b 1 → 2"] : [], hold: [], electronChanged },
            advisories
        }));

        writeFileSync(`${bin}/gh`, `#!/bin/sh\necho "$*" >> "${dir}/gh.log"\ncase "$*" in "issue list"*) [ -n "$EXISTING_ISSUE" ] && echo "$EXISTING_ISSUE";; esac\nexit 0\n`);
        if (!HAS_JQ) {
            writeFileSync(`${bin}/jq.js`, JQ_STUB);
            writeFileSync(`${bin}/jq`, `#!/bin/sh\nexec node "${bin}/jq.js" "$@"\n`);
        }

        const sha256 = file => spawnSync(BASH, ["-c", `sha256sum "${deps}/${file}"`], { encoding: "utf8" }).stdout.replace(/^\\/, "").split(" ")[0];
        const stepOutputs = {};
        const values = {
            "needs.resolve.outputs.base": base,
            "needs.resolve.outputs.root_changed": root,
            "needs.resolve.outputs.desktop_changed": desktop,
            "needs.resolve.outputs.root_lock_sha256": wrongFile ? "0".repeat(64) : sha256("pnpm-lock.yaml"),
            "needs.resolve.outputs.desktop_lock_sha256": sha256("bun.lock"),
            "needs.resolve.outputs.report_sha256": sha256("report.json"),
            "needs.check-root.result": rootCheck ?? (root ? "success" : "skipped"),
            "needs.check-desktop.result": desktopCheck ?? (desktop ? "success" : "skipped"),
            "needs.check-root.outputs.client_changed": clientChanged,
            "needs.check-desktop.outputs.app_changed": appChanged
        };
        const fill = text => String(text).replace(/\$\{\{\s*(.+?)\s*\}\}/g, (_, name) => {
            if (name.startsWith("steps.commit.outputs.")) return stepOutputs[name.slice("steps.commit.outputs.".length)] ?? "";
            assert.ok(name in values, `the test has no value for ${name}`);
            return values[name];
        });

        const outputFile = `${dir}/output`;
        let stdout = "", failedStep = null;
        for (const step of STEPS) {
            writeFileSync(outputFile, "");
            const env = {
                ...process.env,
                PATH: bin + delimiter + process.env.PATH,
                DRY_RUN: String(dryRun),
                REPORT: `${deps}/report.json`,
                RUN_URL: "https://run.invalid/1",
                GITHUB_OUTPUT: outputFile,
                GITHUB_STEP_SUMMARY: `${dir}/summary`,
                EXISTING_ISSUE: existingIssue
            };
            for (const [key, value] of Object.entries(step.env ?? {})) env[key] = fill(value);

            const result = spawnSync(BASH, ["-e", "-c", fill(step.run).replace(/\/tmp\//g, `${dir}/`)], { cwd: work, env, encoding: "utf8" });
            stdout += result.stdout;
            for (const line of readFileSync(outputFile, "utf8").split("\n")) {
                const [key, value] = line.split("=");
                if (key) stepOutputs[key] = value;
            }
            if (result.status !== 0) {
                failedStep = step.name;
                appendFileSync(`${dir}/failure`, result.stderr);
                break;
            }
        }

        const calls = existsSync(`${dir}/gh.log`) ? readFileSync(`${dir}/gh.log`, "utf8").trim().split("\n") : [];
        return {
            failedStep,
            stdout,
            commits: git(origin, "log", "--format=%s", "main").split("\n"),
            rootLock: git(origin, "show", "main:pnpm-lock.yaml"),
            desktopLock: git(origin, "show", "main:desktop/bun.lock"),
            workflows: calls.filter(call => call.startsWith("workflow run")).map(call => call.split(" ")[2]),
            issueCalls: calls.flatMap(call => call.match(/^issue (create|edit \d+|close \d+)/)?.[0] ?? []),
            calls,
            issue: existsSync(`${dir}/issue.md`) ? readFileSync(`${dir}/issue.md`, "utf8") : ""
        };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe("update-deps publish job", () => {
    it("has the steps this test runs", () => {
        assert.deepEqual(STEPS.map(step => step.name), [
            "Make sure these are the files resolve made", "Commit what passed", "Ship it", "Tell a person, or stop telling them"
        ]);
    });

    it("ships a passing update that changes the client, with tests and a new build", () => {
        const run = runPublish({ root: true, clientChanged: true });
        assert.equal(run.failedStep, null);
        assert.deepEqual(run.commits, ["Update dependencies", "start"]);
        assert.equal(run.rootLock, "new root");
        assert.equal(run.desktopLock, "old desktop");
        assert.deepEqual(run.workflows, ["test.yml", "build.yml"]);
        assert.deepEqual(run.issueCalls, []);
        assert.match(run.stdout, /::notice::Shipped 1 commit\(s\), new Nightcord build: true, new Nightcord Desktop build: false\./);
    });

    it("ships an update of build tools without a release nobody needs", () => {
        const run = runPublish({ root: true, clientChanged: false });
        assert.equal(run.rootLock, "new root");
        assert.deepEqual(run.workflows, ["test.yml"]);
    });

    it("starts a Desktop build when the app's code changed", () => {
        const run = runPublish({ desktop: true, appChanged: true });
        assert.equal(run.desktopLock, "new desktop");
        assert.deepEqual(run.workflows, ["test.yml", "desktop.yml"]);
    });

    it("starts a Desktop build when only Electron changed, which the bundles do not show", () => {
        assert.deepEqual(runPublish({ desktop: true, electronChanged: true }).workflows, ["test.yml", "desktop.yml"]);
    });

    it("starts no Desktop build for its build tools", () => {
        const run = runPublish({ desktop: true });
        assert.equal(run.desktopLock, "new desktop");
        assert.deepEqual(run.workflows, ["test.yml"]);
    });

    it("ships both parts as a commit each", () => {
        const run = runPublish({ root: true, desktop: true, clientChanged: true, appChanged: true });
        assert.deepEqual(run.commits, ["Update Nightcord Desktop's dependencies", "Update dependencies", "start"]);
        assert.deepEqual(run.workflows, ["test.yml", "build.yml", "desktop.yml"]);
    });

    it("ships nothing when the checks failed, and tells a person", () => {
        const run = runPublish({ root: true, rootCheck: "failure", clientChanged: true });
        assert.equal(run.failedStep, null);
        assert.deepEqual(run.commits, ["start"]);
        assert.deepEqual(run.workflows, []);
        assert.deepEqual(run.issueCalls, ["issue create"]);
        assert.match(run.issue, /checks failed with the new versions: https:\/\/run\.invalid\/1/);
        assert.match(run.issue, /- a 1 → 2/);
    });

    it("treats a cancelled check like a failed one", () => {
        const run = runPublish({ desktop: true, desktopCheck: "cancelled" });
        assert.deepEqual(run.commits, ["start"]);
        assert.deepEqual(run.issueCalls, ["issue create"]);
    });

    it("holds only the part with a reason to wait", () => {
        const run = runPublish({ root: true, clientChanged: true, rootHold: ["x is new here and only exists since 2026-11-01"], desktop: true, electronChanged: true });
        assert.deepEqual(run.commits, ["Update Nightcord Desktop's dependencies", "start"]);
        assert.equal(run.rootLock, "old root");
        assert.equal(run.desktopLock, "new desktop");
        assert.deepEqual(run.workflows, ["test.yml", "desktop.yml"], "no Nightcord build for a lockfile that did not ship");
        assert.match(run.issue, /x is new here/);
    });

    it("tells a person when pnpm refused the update", () => {
        const run = runPublish({ rootHold: ['The update was refused:\n\n```\nHigh-risk trust downgrade for "x"\n```'] });
        assert.equal(run.failedStep, null);
        assert.deepEqual(run.issueCalls, ["issue create"]);
        assert.match(run.issue, /High-risk trust downgrade for "x"/);
    });

    it("tells a person about serious advisories even when nothing changed", () => {
        const run = runPublish({ advisories: ["pkg: bad (high, https://adv.invalid)"] });
        assert.deepEqual(run.issueCalls, ["issue create"]);
        assert.match(run.issue, /- pkg: bad \(high, https:\/\/adv\.invalid\)/);
    });

    it("updates the open issue rather than opening a second one", () => {
        assert.deepEqual(runPublish({ root: true, rootCheck: "failure", existingIssue: "12" }).issueCalls, ["issue edit 12"]);
    });

    it("closes the issue once it is over", () => {
        assert.deepEqual(runPublish({ existingIssue: "12" }).issueCalls, ["issue close 12"]);
        assert.deepEqual(runPublish({ root: true, existingIssue: "12" }).issueCalls, ["issue close 12"]);
    });

    it("says nothing when there is nothing to say", () => {
        const run = runPublish({});
        assert.equal(run.failedStep, null);
        assert.deepEqual(run.commits, ["start"]);
        assert.deepEqual(run.calls.filter(call => !call.startsWith("issue list")), []);
    });

    it("changes nothing when only trying, whatever it finds", () => {
        const run = runPublish({ dryRun: true, root: true, desktop: true, clientChanged: true, appChanged: true, existingIssue: "12" });
        assert.equal(run.failedStep, null);
        assert.deepEqual(run.commits, ["start"]);
        assert.deepEqual(run.calls, []);
        assert.match(run.stdout, /::notice::Only a try, nothing was pushed\. It would ship 2 commit\(s\), new Nightcord build: true, new Nightcord Desktop build: true\./);
    });

    it("leaves main alone if it moved during the run", () => {
        const run = runPublish({ root: true, clientChanged: true, mainMoved: true });
        assert.equal(run.failedStep, null);
        assert.deepEqual(run.commits, ["someone else", "start"]);
        assert.deepEqual(run.workflows, []);
    });

    it("stops before anything else if a file is not the one resolve made", () => {
        const run = runPublish({ root: true, clientChanged: true, wrongFile: true });
        assert.equal(run.failedStep, "Make sure these are the files resolve made");
        assert.deepEqual(run.commits, ["start"]);
        assert.deepEqual(run.calls, []);
    });
});
