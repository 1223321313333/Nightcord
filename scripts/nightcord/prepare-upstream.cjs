/*
 * Builds the rebranded upstream commit that a sync with Equicord merges: the Equicord commit with the Nightcord
 * name (rebrand.cjs), its imports sorted again after the rename, and Equicord's workflows kept as they were at the
 * last sync. Its parents are the previous rebranded upstream and the Equicord commit, and its message names the
 * Equicord commit, which the sync workflow reads to tell what was synced last.
 *
 * The sync workflow (.github/workflows/sync-equicord.yml) runs this. To sync by hand, run it too, so that the
 * result is the same; do not build the commit some other way:
 *   git fetch equicord dev && git fetch origin
 *   node scripts/nightcord/prepare-upstream.cjs equicord/dev
 *   git switch -c nc-sync origin/main && git merge nc-upstream   (then resolve-sync.cjs and the checks)
 * and push nc-upstream to upstream-nightcord only together with the sync reaching main.
 *
 * Usage: node scripts/nightcord/prepare-upstream.cjs <Equicord commit> [base, default origin/upstream-nightcord]
 *        [branch to point at the result, default nc-upstream]
 * Prints the new commit. Needs `pnpm install` in this checkout, for eslint.
 */
// @ts-check
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// NIGHTCORD_PREPARE_ROOT: another repository to work in (tests use a scratch one)
const ROOT = process.env.NIGHTCORD_PREPARE_ROOT ?? path.join(__dirname, "..", "..");
// Inside the checkout, so that Node finds its node_modules (eslint and the plugins Equicord's config imports)
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

    // Same import order as Nightcord after the rename, otherwise every renamed import conflicts
    try {
        execFileSync(process.execPath, [path.join(ROOT, "node_modules", "eslint", "bin", "eslint.js"), "--fix", "src", "scripts"], { cwd: WORK, stdio: "inherit" });
    } catch (e) {
        // 1: what --fix cannot fix, Equicord's code under Nightcord's lint setup, which does not matter here.
        // 2: eslint did not run at all (say Equicord's config needs a plugin this checkout lacks), so nothing was sorted.
        if (/** @type {{ status?: number }} */ (e).status !== 1)
            console.log("::warning::eslint --fix did not run on the rebranded upstream, so its imports are not sorted; expect import-order conflicts");
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
