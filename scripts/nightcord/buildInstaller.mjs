/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Builds dist/NightcordInstaller.exe from installer/NightcordInstaller.cs with the C# compiler that ships with
// .NET Framework 4.x (present on every Windows 10/11 and on GitHub's Windows runners). Windows only.
// Usage: node scripts/nightcord/buildInstaller.mjs

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..", "..");

if (process.platform !== "win32") {
    console.error("The installer can only be built on Windows.");
    process.exit(1);
}

const windir = process.env.WINDIR ?? "C:\\Windows";
const csc = ["Framework64", "Framework"]
    .map(dir => join(windir, "Microsoft.NET", dir, "v4.0.30319", "csc.exe"))
    .find(existsSync);

if (!csc) {
    console.error("csc.exe from .NET Framework 4.x was not found.");
    process.exit(1);
}

const out = join(ROOT, "dist", "NightcordInstaller.exe");
mkdirSync(join(ROOT, "dist"), { recursive: true });

execFileSync(csc, [
    "/nologo",
    "/target:winexe",
    "/optimize+",
    "/warnaserror+",
    "/codepage:65001",
    `/out:${out}`,
    `/win32icon:${join(ROOT, "installer", "nightcord.ico")}`,
    `/win32manifest:${join(ROOT, "installer", "app.manifest")}`,
    "/r:System.dll",
    "/r:System.Core.dll",
    "/r:System.Drawing.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.Web.Extensions.dll",
    join(ROOT, "installer", "NightcordInstaller.cs")
], { stdio: "inherit" });

console.log(`Built ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
