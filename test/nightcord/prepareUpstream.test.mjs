/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// prepare-upstream builds the commit every sync merges, in the sync workflow and by hand. Run here in a scratch
// repository on a fake Equicord commit: the result must have the previous upstream and the Equicord commit as
// parents, the Upstream: line the workflow reads, the Nightcord name, Equicord's workflows as they were before, and
// the lines the rename moved or made longer where Equicord's own linter and formatter put them.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import { ROOT } from "./helpers.mjs";

const LINT_CONFIG = {
    jsPlugins: [{ name: "simple-import-sort", specifier: "eslint-plugin-simple-import-sort" }],
    categories: { correctness: "off" },
    rules: { "simple-import-sort/imports": "error" }
};

// One line of JSON that is exactly as long as the formatter allows (100 columns) with the name Equicord in it,
// so that the longer name Nightcord pushes it over
const LIST_LINE = `  "list": ["equicord-${"a".repeat(40)}", "${"b".repeat(33)}"]`;
assert.equal(LIST_LINE.length, 100);

let dir, git, base, equicord, broken, result, run, brokenRun;
const prepare = commit => spawnSync(process.execPath, [join(ROOT, "scripts/nightcord/prepare-upstream.cjs"), commit, base, "nc-upstream"], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NIGHTCORD_PREPARE_ROOT: dir }
});

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
        ".oxlintrc.json": JSON.stringify(LINT_CONFIG, null, 2) + "\n",
        "package.json": JSON.stringify({ name: "equicord", scripts: { fmt: "oxfmt \"**/*.{css,html,json,yml,yaml}\"" } }, null, 2) + "\n",
        "src/a.ts": "export const name = \"Equicord\";\n",
        // sorted as it is, and no longer once EquicordDevs is NightcordDevs
        "src/b.ts": "import { EquicordDevs, Fn } from \"./constants\";\n\nexport const b = [EquicordDevs, Fn];\n",
        "src/data.json": `{\n${LIST_LINE}\n}\n`
    });
    git("add", "-A");
    git("commit", "-q", "-m", "Equicord");
    equicord = git("rev-parse", "HEAD");

    // the same, with a lint config that names a plugin nobody has
    write({ ".oxlintrc.json": JSON.stringify({ ...LINT_CONFIG, jsPlugins: [{ name: "simple-import-sort", specifier: "eslint-plugin-nobody-has" }] }, null, 2) + "\n" });
    git("add", "-A");
    git("commit", "-q", "-m", "Equicord with a lint plugin this checkout lacks");
    broken = git("rev-parse", "HEAD");
    git("checkout", "-q", "main");

    // the script takes oxlint, oxfmt and the lint plugins from its checkout's node_modules: lend it this one's
    writeFileSync(join(dir, ".git", "info", "exclude"), "/node_modules\n");
    symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "junction");

    brokenRun = prepare(broken);
    run = prepare(equicord);
    result = run.stdout.trim().split("\n").at(-1);
});
after(() => {
    // the link itself, never what it points at
    const link = join(dir, "node_modules");
    try {
        if (process.platform === "win32") rmdirSync(link);
        else unlinkSync(link);
    } catch { }
    if (!existsSync(link)) rmSync(dir, { recursive: true, force: true });
});

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

    it("sorts the imports the rename put out of order, with Equicord's own lint rules", () => {
        assert.doesNotMatch(run.stdout, /::warning::/);
        // oxlint leaves no space after the comma it moves; Equicord's own files have the same
        assert.match(git("show", `${result}:src/b.ts`), /^import \{ Fn, ?NightcordDevs \} from "\.\/constants";$/m);
    });

    it("formats again what the rename made too long", () => {
        assert.equal(git("show", `${equicord}:src/data.json`).split("\n").length, 3, "the sample must start out on one line");
        assert.match(git("show", `${result}:src/data.json`), /"list": \[\n\s+"nightcord-a+",\n\s+"b+"\n\s+\]/);
    });

    it("says so when Equicord's linter cannot run here, and still builds the commit", () => {
        assert.equal(brokenRun.status, 0, brokenRun.stdout + brokenRun.stderr);
        assert.match(brokenRun.stdout, /^::warning::.*oxlint did not run.*eslint-plugin-nobody-has/m);
        assert.match(git("show", `${brokenRun.stdout.trim().split("\n").at(-1)}:src/b.ts`), /NightcordDevs, Fn/, "unsorted, as the rename left it");
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
