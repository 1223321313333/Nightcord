/*
 * Every web host that plugin and Nightcord code mentions, for the ~nightcordPluginHosts module the build creates.
 * In strict connections mode (see src/main/csp/index.ts) the Discord window may only reach Discord, the hosts in
 * CspPolicies and these, so plugins keep working while unknown servers are blocked.
 *
 * Usage: node scripts/nightcord/genCspHosts.cjs   prints the list
 */
// @ts-check
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DIRS = ["src/plugins", "src/equicordplugins", "src/nightcordplugins", "src/api", "src/components", "src/utils"];
const SKIP = [
    /(^|\.)(discord\.com|discordapp\.com|discordapp\.net|discord\.gg|discord\.media|discordcdn\.com)$/, // Discord's own CSP covers these
    /(^|\.)example\.(com|org|net)$/, /^localhost$/, /^127\./, /^your-/, /\.local$/,
    /(^|\.)(gnu\.org|apache\.org|mozilla\.org|w3\.org)$/ // license and spec links in comments
];

function* files(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* files(full);
        else if (/\.(tsx?|css)$/.test(entry.name) && !/native(\/|\\|\.)/.test(full)) yield full;
    }
}

function collectHosts() {
    const hosts = new Set();
    for (const dir of DIRS) {
        for (const file of files(path.join(ROOT, dir))) {
            for (const m of fs.readFileSync(file, "utf8").matchAll(/https?:\/\/([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/g)) {
                const host = m[1].toLowerCase();
                if (!SKIP.some(re => re.test(host))) hosts.add(host);
            }
        }
    }
    return [...hosts].sort();
}

module.exports = { collectHosts, DIRS };

if (require.main === module) {
    const list = collectHosts();
    console.log(list.join("\n"));
    console.log(`${list.length} hosts`);
}
