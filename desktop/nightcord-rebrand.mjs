/*
 * Turns this copy of Equibop into Nightcord Desktop. Safe to run again after pulling a newer Equibop into desktop/
 * (see NIGHTCORD.md): every step only replaces what is still Equibop's.
 *
 * Usage (in desktop/): node nightcord-rebrand.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const REPO = "https://github.com/1223321313333/Nightcord";

function* files(dir, exts) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) yield* files(full, exts);
        else if (exts.some(e => name.endsWith(e))) yield full;
    }
}

function edit(file, fn) {
    const before = readFileSync(file, "utf8");
    const after = fn(before);
    if (after !== before) {
        writeFileSync(file, after);
        console.log("changed", file);
    }
}

// 1. The mod's global is Nightcord, not Vencord
for (const file of [...files("src", [".ts", ".tsx"]), ...files("scripts/build", [".mts", ".mjs"])]) {
    edit(file, s => s.replace(/\bVencord\.(?=[A-Z])/g, "Nightcord."));
}
edit("scripts/build/vencordDep.mts", s => s.replace(/: "Vencord(?=[."])/g, ": \"Nightcord"));
edit("src/globals.d.ts", s => s.includes("var Nightcord")
    ? s
    : s.replace("    export var Vencord: any;", "    export var Vencord: any;\n    /** Nightcord's renderer global (Vencord's, renamed) */\n    export var Nightcord: any;"));

// 2. Name and links people see. The plugin name in addPatch stays "Equibop": Nightcord's core checks it
for (const file of [...files("src", [".ts", ".tsx"]), ...files("static/views", [".html"])]) {
    edit(file, s => s
        .replaceAll("https://github.com/Equicord/Equibop", REPO)
        .split("\n")
        .map(line => line.includes("addPatch(") ? line : line.replace(/Equibop(?![A-Za-z])/g, "Nightcord Desktop"))
        .join("\n"));
}
edit("src/main/constants.ts", s => s.replace(/export const USER_AGENT = `[^`]*`;/, `export const USER_AGENT = \`NightcordDesktop/\${app.getVersion()} (${REPO})\`;`));

// 3. package.json: identity, Windows installer only, updates from Nightcord's own "desktop" release
edit("package.json", s => {
    const pkg = JSON.parse(s);
    Object.assign(pkg, {
        name: "nightcord-desktop",
        desktopName: "nightcord-desktop",
        description: "Nightcord Desktop: Discord with Nightcord built in",
        homepage: REPO,
        author: "Nightcord"
    });
    Object.assign(pkg.build, {
        appId: "io.github.nightcord.desktop",
        productName: "Nightcord Desktop",
        executableName: "nightcord-desktop",
        publish: [{ provider: "generic", url: `${REPO}/releases/download/desktop` }]
    });
    pkg.build.win.target = [{ target: "nsis", arch: ["x64"] }];
    // no spaces: GitHub renames uploaded files with spaces, and latest.yml would point at a file that is not there
    pkg.build.nsis = { ...pkg.build.nsis, artifactName: "NightcordDesktop-Setup-${version}.${ext}" };
    if (pkg.build.linux?.desktop?.entry) {
        Object.assign(pkg.build.linux.desktop.entry, { Name: "Nightcord Desktop", StartupWMClass: "nightcord-desktop" });
        pkg.build.linux.maintainer = "Nightcord";
    }
    return JSON.stringify(pkg, null, 4) + "\n";
});

// 4. Install folder of the Windows installer
edit("build/installer.nsh", s => s.replaceAll("$LocalAppData\\equibop", "$LocalAppData\\nightcord-desktop"));

console.log("done");
