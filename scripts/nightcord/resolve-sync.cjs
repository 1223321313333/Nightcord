/*
 * Resolves the merge conflicts that syncing with Equicord always produces, using fixed rules:
 *  - files Nightcord deleted on purpose (Equicord's issue templates, AI rule files, ...) stay deleted
 *  - package.json: take Equicord's version, keep Nightcord's name, description, links and author, and the
 *    dependencies Nightcord added that Equicord does not have
 *  - pnpm-lock.yaml: take ours; the workflow regenerates it with `pnpm install` afterwards
 *  - README.md: take ours; Nightcord's replaces Equicord's
 * Anything else is left for a human. Exits with code 1 and prints the files in that case.
 *
 * Usage (inside a repo with a merge in progress): node scripts/nightcord/resolve-sync.cjs
 * Keep this a single file: the sync workflow copies it elsewhere before running it.
 */
// @ts-check
const { execFileSync } = require("child_process");
const fs = require("fs");

const OUR_PACKAGE_FIELDS = ["name", "description", "homepage", "bugs", "repository", "author"];
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

/**
 * Equicord's package.json with Nightcord's metadata and the dependencies Nightcord added. A dependency is
 * Nightcord's when ours has it but neither the merge base nor Equicord does, so one Equicord removed stays removed.
 * Added entries go where they sort among Equicord's, which keep their order.
 * @param {Record<string, any>} base the merge base (stage 1)
 * @param {Record<string, any>} ours Nightcord (stage 2)
 * @param {Record<string, any>} theirs the rebranded Equicord (stage 3)
 */
function mergePackageJson(base, ours, theirs) {
    const merged = { ...theirs };
    for (const key of OUR_PACKAGE_FIELDS) if (key in ours) merged[key] = ours[key];

    for (const field of DEPENDENCY_FIELDS) {
        const added = Object.entries(ours[field] ?? {})
            .filter(([name]) => !(name in (base[field] ?? {})) && !(name in (theirs[field] ?? {})))
            .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
        if (!added.length) continue;

        /** @type {Record<string, string>} */
        const deps = {};
        let i = 0;
        for (const [name, version] of Object.entries(theirs[field] ?? {})) {
            for (; i < added.length && added[i][0] < name; i++) deps[added[i][0]] = added[i][1];
            deps[name] = version;
        }
        for (; i < added.length; i++) deps[added[i][0]] = added[i][1];
        merged[field] = deps;
    }

    return merged;
}

module.exports = { mergePackageJson };

if (require.main === module) {
    const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

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
            const [base, ours, theirs] = [1, 2, 3].map(stage => JSON.parse(git("show", `:${stage}:${file}`)));
            const merged = mergePackageJson(base, ours, theirs);
            fs.writeFileSync(file, JSON.stringify(merged, null, 4) + "\n");
            git("add", "--", file);
            const kept = DEPENDENCY_FIELDS.flatMap(f => Object.keys(merged[f] ?? {}).filter(d => !(d in (theirs[f] ?? {}))));
            console.log(`merged package.json (Equicord's version, Nightcord's metadata${kept.length ? ` and dependencies: ${kept.join(", ")}` : ""})`);
        } else if (file === "pnpm-lock.yaml") {
            git("checkout", "--ours", "--", file);
            git("add", "--", file);
            console.log("pnpm-lock.yaml: kept ours, regenerate with pnpm install");
        } else if (file === "README.md") {
            git("checkout", "--ours", "--", file);
            git("add", "--", file);
            console.log("README.md: kept ours");
        } else {
            left.push(`${code} ${file}`);
        }
    }

    if (left.length) {
        console.log("\nNeeds a human:\n" + left.map(l => "  " + l).join("\n"));
        process.exit(1);
    }
    console.log("\nAll conflicts resolved.");
}
