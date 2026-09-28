/*
 * Resolves the merge conflicts that syncing with Equicord always produces, using fixed rules:
 *  - files Nightcord deleted on purpose (Equicord's issue templates, AI rule files, ...) stay deleted
 *  - package.json: take Equicord's version, keep Nightcord's name, description, links and author
 *  - pnpm-lock.yaml: take ours; the workflow regenerates it with `pnpm install` afterwards
 * Anything else is left for a human. Exits with code 1 and prints the files in that case.
 *
 * Usage (inside a repo with a merge in progress): node scripts/nightcord/resolve-sync.cjs
 */
// @ts-check
const { execFileSync } = require("child_process");
const fs = require("fs");

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const OUR_PACKAGE_FIELDS = ["name", "description", "homepage", "bugs", "repository", "author"];

const unmerged = git("status", "--porcelain")
    .split("\n")
    .filter(l => /^(DD|AU|UD|UA|DU|AA|UU) /.test(l))
    .map(l => ({ code: l.slice(0, 2), file: l.slice(3).replace(/^"|"$/g, "") }));

const left = [];
for (const { code, file } of unmerged) {
    if (code === "DU" || code === "DD") {
        // deleted by us: keep it deleted
        git("rm", "-q", "--", file);
        console.log(`kept deleted: ${file}`);
    } else if (file === "package.json" && code === "UU") {
        const ours = JSON.parse(git("show", `:2:${file}`));
        const theirs = JSON.parse(git("show", `:3:${file}`));
        for (const key of OUR_PACKAGE_FIELDS) if (key in ours) theirs[key] = ours[key];
        fs.writeFileSync(file, JSON.stringify(theirs, null, 4) + "\n");
        git("add", "--", file);
        console.log("merged package.json (Equicord's version, Nightcord's metadata)");
    } else if (file === "pnpm-lock.yaml") {
        git("checkout", "--ours", "--", file);
        git("add", "--", file);
        console.log("pnpm-lock.yaml: kept ours, regenerate with pnpm install");
    } else {
        left.push(`${code} ${file}`);
    }
}

if (left.length) {
    console.log("\nNeeds a human:\n" + left.map(l => "  " + l).join("\n"));
    process.exit(1);
}
console.log("\nAll conflicts resolved.");
