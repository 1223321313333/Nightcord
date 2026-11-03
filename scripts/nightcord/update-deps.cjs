/*
 * The first step of the weekly dependency update (.github/workflows/update-deps.yml): moves pnpm-lock.yaml and
 * desktop/bun.lock to the newest versions the manifests allow and says what changed and whether a person should look.
 *
 * Only the lockfiles change. The manifests are Equicord's and Equibop's: a version changed there would conflict with
 * the next sync, and new majors and exact pins arrive with those syncs anyway. pnpm also keeps packages at the versions
 * Equicord holds them at this way, some of which break the build when bumped ahead of it.
 *
 * This runs no code of any dependency, both package managers only read registry metadata here, so what it produces can
 * be trusted by the job that publishes it.
 *
 * What protects against a hijacked package, since nobody reads these updates:
 *  - a version has to be COOLDOWN_DAYS old, by when most of them have been caught
 *  - pnpm refuses a version that lost its publishing guarantees (trustPolicy), the usual sign of a stolen account
 *  - a package that was not in the lockfile yet has to exist for NEW_PACKAGE_DAYS, or a person looks at it first
 *  - nothing may start coming from outside the npm registry
 *
 * Usage: node scripts/nightcord/update-deps.cjs <output directory>
 * Writes the new lockfiles and report.json there, and the step outputs to $GITHUB_OUTPUT.
 */
// @ts-check
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const COOLDOWN_DAYS = 7;
const NEW_PACKAGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every locked package of a pnpm lockfile as "name@version". The file can hold several YAML documents, the last one
 * is the project's.
 * @param {string} text
 */
function pnpmLockEntries(text) {
    const lf = text.replace(/\r\n/g, "\n");
    const section = lf.slice(lf.lastIndexOf("\npackages:\n"), lf.lastIndexOf("\nsnapshots:\n"));
    return [...section.matchAll(/^ {2}'?([^\s'][^\n']*?)'?:\s*$/gm)].map(m => m[1]);
}

/**
 * Every locked package of a bun lockfile as "name@version".
 * @param {string} text
 */
function bunLockEntries(text) {
    const lf = text.replace(/\r\n/g, "\n");
    const section = lf.slice(lf.lastIndexOf('\n  "packages": {\n'));
    return [...new Set([...section.matchAll(/^ {4}"[^"]+": \["([^"]+)"/gm)].map(m => m[1]))];
}

/** @param {string} entry "name@version", where a scoped name starts with an @ of its own */
function splitEntry(entry) {
    const at = entry.indexOf("@", 1);
    return { name: entry.slice(0, at), version: entry.slice(at + 1) };
}

const isRegistryVersion = (/** @type {string} */ version) => /^\d/.test(version);

/**
 * @param {string[]} before
 * @param {string[]} after
 */
function diffEntries(before, after) {
    /** @param {string[]} entries */
    const byName = entries => {
        /** @type {Map<string, string[]>} */
        const names = new Map();
        for (const entry of entries) {
            const { name, version } = splitEntry(entry);
            names.set(name, [...names.get(name) ?? [], version]);
        }
        return names;
    };
    const was = byName(before), now = byName(after);
    const sorted = (/** @type {Iterable<string>} */ names) => [...names].sort();

    return {
        added: sorted(now.keys()).filter(name => !was.has(name)),
        removed: sorted(was.keys()).filter(name => !now.has(name)),
        changed: sorted(now.keys()).filter(name => was.has(name)).flatMap(name => {
            const from = was.get(name)?.filter(v => !now.get(name)?.includes(v)) ?? [];
            const to = now.get(name)?.filter(v => !was.get(name)?.includes(v)) ?? [];
            return from.length || to.length ? [{ name, from, to }] : [];
        }),
        // what comes from a git repository or a URL rather than from npm, and did not before
        notFromRegistry: after.filter(entry => !before.includes(entry) && !isRegistryVersion(splitEntry(entry).version))
    };
}

/**
 * One line per change, for the commit message and the issue.
 * @param {ReturnType<typeof diffEntries>} diff
 * @param {string[]} entries the new lockfile's entries
 */
function describeDiff(diff, entries) {
    const versions = (/** @type {string} */ name) => entries.map(splitEntry).filter(e => e.name === name).map(e => e.version).join(", ");
    return [
        ...diff.changed.map(({ name, from, to }) => `- ${name} ${from.join(", ") || "(another copy)"} → ${to.join(", ") || "(no longer needed)"}`),
        ...diff.added.map(name => `- ${name} ${versions(name)} (new)`),
        ...diff.removed.map(name => `- ${name} (no longer needed)`)
    ];
}

/**
 * Why a person should look at these changes before they ship.
 * @param {ReturnType<typeof diffEntries>} diff
 * @param {(name: string) => Promise<Date>} firstPublished
 * @param {number} now
 */
async function holdReasons(diff, firstPublished, now) {
    const reasons = diff.notFromRegistry.map(entry => `${entry} does not come from the npm registry`);
    for (const name of diff.added) {
        const published = await firstPublished(name).catch(() => null);
        if (!published) reasons.push(`${name} is new here, and npm does not say since when it exists`);
        else if (now - published.getTime() < NEW_PACKAGE_DAYS * DAY_MS)
            reasons.push(`${name} is new here and only exists since ${published.toISOString().slice(0, 10)}`);
    }
    return reasons;
}

/**
 * The policy pnpm resolves under, as environment variables since these override pnpm-workspace.yaml, which is
 * Equicord's. The versions already locked pass as they are: they were accepted earlier, and a sync can have brought
 * ones younger than the cooldown, which pnpm would otherwise refuse to even read.
 * @param {string[]} entries
 */
function pnpmPolicy(entries) {
    const locked = JSON.stringify(entries.filter(entry => isRegistryVersion(splitEntry(entry).version)));
    return {
        PNPM_CONFIG_MINIMUM_RELEASE_AGE: String(COOLDOWN_DAYS * 24 * 60),
        PNPM_CONFIG_MINIMUM_RELEASE_AGE_EXCLUDE: locked,
        PNPM_CONFIG_TRUST_POLICY: "no-downgrade",
        PNPM_CONFIG_TRUST_POLICY_EXCLUDE: locked
    };
}

/**
 * The high and critical advisories that remain. These do not hold anything back, a person just needs to know.
 * @param {string} auditJson output of pnpm audit --json
 */
function seriousAdvisories(auditJson) {
    const { advisories = {} } = JSON.parse(auditJson.slice(auditJson.indexOf("{")));
    return Object.values(advisories)
        .filter((/** @type {any} */ a) => a.severity === "high" || a.severity === "critical")
        .map((/** @type {any} */ a) => `${a.module_name}: ${a.title} (${a.severity}, ${a.url})`)
        .sort();
}

module.exports = { pnpmLockEntries, bunLockEntries, splitEntry, diffEntries, describeDiff, holdReasons, pnpmPolicy, seriousAdvisories, COOLDOWN_DAYS };

if (require.main === module) {
    const out = process.argv[2];
    if (!out) throw new Error("Usage: node scripts/nightcord/update-deps.cjs <output directory>");

    /**
     * @param {string} command
     * @param {string[]} args
     * @param {{ cwd?: string; env?: Record<string, string>; }} [options]
     */
    const run = (command, args, { cwd, env } = {}) => execFileSync(command, args, {
        cwd,
        encoding: "utf8",
        env: { ...process.env, ...env, NO_COLOR: "1", FORCE_COLOR: "0" },
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 64 * 1024 * 1024
    });
    /** @param {unknown} e */
    const failure = e => {
        const { stderr, stdout, message } = /** @type {{ stderr?: string; stdout?: string; message: string; }} */ (e);
        return (stderr || stdout || message).trim().split("\n").slice(-20).join("\n");
    };
    /** @param {string} name */
    const firstPublished = async name => {
        const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return new Date((await response.json()).time.created);
    };

    /**
     * @param {{ title: string; file: string; entriesOf: (text: string) => string[]; update: (entries: string[]) => void; }} part
     */
    const updateLockfile = async ({ title, file, entriesOf, update }) => {
        const beforeText = fs.readFileSync(file, "utf8");
        const before = entriesOf(beforeText);
        try {
            update(before);
        } catch (e) {
            fs.writeFileSync(file, beforeText);
            return { changed: false, before, after: before, message: "", lines: [], hold: [`The update was refused:\n\n\`\`\`\n${failure(e)}\n\`\`\``] };
        }

        const after = entriesOf(fs.readFileSync(file, "utf8"));
        const diff = diffEntries(before, after);
        const lines = describeDiff(diff, after);
        return {
            changed: lines.length > 0,
            before,
            after,
            message: `${title}\n\n${lines.join("\n")}\n`,
            lines,
            hold: await holdReasons(diff, firstPublished, Date.now())
        };
    };

    (async () => {
        const root = await updateLockfile({
            title: "Update dependencies",
            file: "pnpm-lock.yaml",
            entriesOf: pnpmLockEntries,
            update: entries => run("pnpm", ["update", "-r", "--lockfile-only", "--no-save"], { env: pnpmPolicy(entries) })
        });

        const desktop = await updateLockfile({
            title: "Update Nightcord Desktop's dependencies",
            file: path.join("desktop", "bun.lock"),
            entriesOf: bunLockEntries,
            // resolved afresh, since bun update would also rewrite the ranges in package.json
            update: () => {
                fs.rmSync(path.join("desktop", "bun.lock"));
                run("bun", ["install", "--lockfile-only", `--minimum-release-age=${COOLDOWN_DAYS * 24 * 60 * 60}`], { cwd: "desktop" });
            }
        });
        const electron = (/** @type {string[]} */ entries) => entries.filter(entry => splitEntry(entry).name === "electron").join();

        // exit code 1 only means something was found
        /** @type {string[]} */
        let advisories = [];
        try {
            let audit;
            try {
                audit = run("pnpm", ["audit", "--json"]);
            } catch (e) {
                audit = /** @type {{ stdout?: string; }} */ (e).stdout ?? "{}";
            }
            advisories = seriousAdvisories(audit);
        } catch (e) {
            console.log(`::warning::pnpm audit gave no answer: ${failure(e).replace(/\n/g, " ")}`);
        }

        fs.mkdirSync(out, { recursive: true });
        fs.copyFileSync("pnpm-lock.yaml", path.join(out, "pnpm-lock.yaml"));
        fs.copyFileSync(path.join("desktop", "bun.lock"), path.join(out, "bun.lock"));
        const part = (/** @type {typeof root} */ { changed, message, lines, hold }) => ({ changed, message, lines, hold });
        fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({
            root: part(root),
            desktop: { ...part(desktop), electronChanged: electron(desktop.before) !== electron(desktop.after) },
            advisories
        }, null, 4));

        const sha256 = (/** @type {string} */ file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(out, file))).digest("hex");
        const outputs = [
            `root_changed=${root.changed}`,
            `desktop_changed=${desktop.changed}`,
            `root_lock_sha256=${sha256("pnpm-lock.yaml")}`,
            `desktop_lock_sha256=${sha256("bun.lock")}`,
            `report_sha256=${sha256("report.json")}`
        ].join("\n") + "\n";
        if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs);
        else process.stdout.write(outputs);

        for (const [title, { lines, hold }] of /** @type {const} */ ([["Nightcord", root], ["Nightcord Desktop", desktop]])) {
            console.log(`\n## ${title}: ${lines.length} change(s), ${hold.length} reason(s) to hold\n${[...lines, ...hold].join("\n")}`);
        }
        if (advisories.length) console.log(`\n## Serious advisories\n${advisories.join("\n")}`);
    })().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
