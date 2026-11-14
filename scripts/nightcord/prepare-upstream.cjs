/*
 * Builds the rebranded upstream commit that a sync with Equicord merges: the Equicord commit with the Nightcord
 * name (rebrand.cjs), linted and formatted again after the rename, and Equicord's workflows kept as they were at the
 * last sync. Its parents are the previous rebranded upstream and the Equicord commit, and its message names the
 * Equicord commit, which the sync workflow reads to tell what was synced last.
 *
 * The sync workflow (.github/workflows/sync-equicord.yml) runs this. To sync by hand, run it too, so that the
 * result is the same; do not build the commit some other way:
 *   git fetch equicord dev && git fetch origin
 *   node scripts/nightcord/prepare-upstream.cjs equicord/dev
 *   git switch -c nc-sync origin/main && git merge nc-upstream   (then resolve-sync.cjs and the checks)
 * and push nc-upstream to upstream-nightcord once the sync goes to main or to a review branch: the next sync builds on it.
 *
 * Usage: node scripts/nightcord/prepare-upstream.cjs <Equicord commit> [base, default origin/upstream-nightcord]
 *        [branch to point at the result, default nc-upstream]
 * Prints the new commit. Needs `pnpm install` in this checkout, for oxlint, oxfmt and the lint plugins.
 */
// @ts-check
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// NIGHTCORD_PREPARE_ROOT: another repository to work in (tests use a scratch one)
const ROOT = process.env.NIGHTCORD_PREPARE_ROOT ?? path.join(__dirname, "..", "..");
// Inside the checkout, so that Node finds its node_modules (the plugins Equicord's lint config names)
const WORK = path.join(ROOT, ".upstream-work");

const [target, base = "origin/upstream-nightcord", branch = "nc-upstream"] = process.argv.slice(2);
if (!target) throw new Error("Usage: node scripts/nightcord/prepare-upstream.cjs <Equicord commit> [base] [branch]");

const git = (args, cwd = ROOT) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const exists = (rev, file) => {
    try {
        git(["cat-file", "-e", `${rev}:${file}`]);
        return true;
    } catch {
        return false;
    }
};

/**
 * Runs one of this checkout's tools on the rebranded files.
 * @param {string} tool the package, whose executable is bin/<its name>
 * @param {string[]} args
 */
function runTool(tool, args) {
    const bin = path.join(ROOT, "node_modules", tool, "bin", tool);
    if (!fs.existsSync(bin)) return { missing: true, stdout: "", output: "" };
    const { stdout = "", stderr = "", status } = spawnSync(process.execPath, [bin, ...args], { cwd: WORK, encoding: "utf8", maxBuffer: 1 << 28 });
    return { missing: false, status, stdout, output: (stdout + stderr).trim() };
}

const firstLines = (/** @type {string} */ text) => text.split(/\r?\n/).filter(l => l.trim()).slice(0, 4).join(" ").slice(0, 400);

/**
 * `pnpm lint:fix` as Equicord runs it, with Equicord's rules: renamed imports go where they sort now.
 * Never with a linter Equicord does not use: one that finds no config in the files looks for it further up, finds
 * Nightcord's, and "fixes" Equicord's files by rules they were not written for (this is how `eslint --fix` deleted
 * Equicord's lint comments on 2026-11-09, after Equicord had moved to oxlint).
 * @returns {string | null} why the files were not linted, or null when they were
 */
function lintFix() {
    if (!fs.existsSync(path.join(WORK, ".oxlintrc.json"))) return "Equicord has no .oxlintrc.json";

    const run = runTool("oxlint", ["--fix", "--format=json"]);
    if (run.missing) return "oxlint is not installed in this checkout";
    // Exit code 1 is both "problems --fix cannot fix" (Equicord's code, which does not matter here) and "did not
    // run" (say the config names a plugin this checkout lacks). Only a run that linted prints its findings as JSON.
    try {
        if (Array.isArray(JSON.parse(run.stdout).diagnostics)) return null;
    } catch { }
    return `oxlint did not run: ${firstLines(run.output) || `exit code ${run.status}`}`;
}

/**
 * `pnpm fmt` as Equicord runs it: a renamed line can be too long for where the formatter had put it.
 * @returns {string | null} why the files were not formatted, or null when they were
 */
function format() {
    const manifest = path.join(WORK, "package.json");
    /** @type {string | undefined} */
    const script = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")).scripts?.fmt : undefined;
    if (script === undefined) return null; // Equicord does not format its files
    const glob = /^oxfmt "([^"]+)"$/.exec(script)?.[1];
    if (!glob) return `Equicord's fmt script is not the one this knows how to run: ${script}`;

    const run = runTool("oxfmt", [glob]);
    if (run.missing) return "oxfmt is not installed in this checkout";
    return run.status === 0 ? null : `oxfmt failed: ${firstLines(run.output) || `exit code ${run.status}`}`;
}

const commit = git(["rev-parse", "--verify", `${target}^{commit}`]);
const baseCommit = git(["rev-parse", "--verify", `${base}^{commit}`]);

// --git-common-dir is relative (".git") in the main checkout
const exclude = path.join(path.resolve(ROOT, git(["rev-parse", "--git-common-dir"])), "info", "exclude");
const excludeLine = "/.upstream-work/";
const excluded = fs.existsSync(exclude) ? fs.readFileSync(exclude, "utf8") : "";
if (!excluded.split(/\r?\n/).includes(excludeLine)) {
    fs.mkdirSync(path.dirname(exclude), { recursive: true });
    fs.appendFileSync(exclude, (excluded && !excluded.endsWith("\n") ? "\n" : "") + excludeLine + "\n");
}

// what an interrupted run left behind
if (fs.existsSync(WORK)) git(["worktree", "remove", "--force", WORK]);
git(["worktree", "prune"]);

git(["worktree", "add", "--detach", WORK, commit]);
try {
    execFileSync(process.execPath, [path.join(__dirname, "rebrand.cjs"), WORK], { stdio: "inherit" });

    // Without these the sync still merges, but every line the rename moved or made longer conflicts or fails the
    // checks afterwards. The warning goes into the issue the sync workflow opens.
    for (const problem of [lintFix(), format()]) {
        if (problem) console.log(`::warning::The rebranded upstream is not as \`pnpm lint:fix\` and \`pnpm fmt\` would leave it (${problem}); expect conflicts in imports`);
    }

    // The workflow token may not push changes to workflow files, and Nightcord has its own CI anyway:
    // keep Equicord's workflows as they were at the last sync
    if (exists(baseCommit, ".github/workflows")) {
        fs.rmSync(path.join(WORK, ".github", "workflows"), { recursive: true, force: true });
        git(["checkout", baseCommit, "--", ".github/workflows"], WORK);
    }

    git(["add", "-A"], WORK);
    const tree = git(["write-tree"], WORK);
    const result = git(["commit-tree", tree, "-p", baseCommit, "-p", commit,
        "-m", `Equicord ${commit.slice(0, 9)} rebranded to Nightcord`, "-m", `Upstream: ${commit}`]);
    git(["branch", "-f", branch, result]);
    console.log(result);
} finally {
    git(["worktree", "remove", "--force", WORK]);
}
