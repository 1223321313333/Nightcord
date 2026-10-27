/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { existsSync, lstatSync, mkdirSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "original-fs";
import { basename, dirname, join } from "path";

import { pickNewestVersion, VERSION_PREFIX } from "./hostPatchVersion";

const STUB_PACKAGE = JSON.stringify({ name: "discord", main: "index.js" });

const makeStubIndex = (patcherPath: string) =>
    `require(${JSON.stringify(patcherPath)});`;

/** `_app.asar` next to `app.asar` marks any patched install. */
export const isAlreadyPatched = (resources: string) =>
    existsSync(join(resources, "_app.asar"));

/**
 * apply the folder-shim patch to a discord `resources/` directory.
 *
 * renames vanilla `app.asar` to `_app.asar`, creates an `app/` folder
 * whose `index.js` requires the given patcher script. electron prefers
 * the folder over the asar of the same name and loads it first.
 *
 * idempotent. returns `false` if the directory is already patched or
 * has no vanilla `app.asar`. throws on partial failure after rolling
 * back any disk changes already made.
 */
export const patchResourcesDir = (resources: string, patcherJsPath: string): boolean => {
    const app = join(resources, "app.asar");
    const _app = join(resources, "_app.asar");

    if (isAlreadyPatched(resources) || !existsSync(app) || existsSync(_app)) return false;
    try {
        if (lstatSync(app).isDirectory()) return false;
    } catch {
        return false;
    }

    const undo: Array<() => void> = [];
    try {
        renameSync(app, _app);
        undo.push(() => renameSync(_app, app));

        mkdirSync(app);
        undo.push(() => {
            const indexPath = join(app, "index.js");
            const pkgPath = join(app, "package.json");
            if (existsSync(indexPath)) unlinkSync(indexPath);
            if (existsSync(pkgPath)) unlinkSync(pkgPath);
            rmdirSync(app);
        });

        writeFileSync(join(app, "package.json"), STUB_PACKAGE);
        writeFileSync(join(app, "index.js"), makeStubIndex(patcherJsPath));
        return true;
    } catch (err) {
        for (let i = undo.length - 1; i >= 0; i--) {
            try {
                undo[i]();
            } catch (cleanupErr) {
                console.error("[Nightcord] Rollback step failed", cleanupErr);
            }
        }
        throw err;
    }
};

/**
 * find the newest sibling `app-VERSION` directory's `resources/` path.
 *
 * squirrel-only layout. returns `null` on non-win32 platforms, or when
 * the running process is already in the newest sibling.
 */
export const findStaleSibling = (currentExeDir: string): string | null => {
    if (process.platform !== "win32") return null;

    const discordPath = dirname(currentExeDir);
    const currentVersion = basename(currentExeDir);

    let siblings: string[];
    try {
        siblings = readdirSync(discordPath).filter(name => {
            if (!name.startsWith(VERSION_PREFIX)) return false;
            try {
                return statSync(join(discordPath, name)).isDirectory();
            } catch (statErr) {
                console.error("[Nightcord] Skipping unreadable sibling", name, statErr);
                return false;
            }
        });
    } catch (err) {
        console.error("[Nightcord] Failed to scan for sibling versions", err);
        return null;
    }

    const latest = pickNewestVersion(siblings, currentVersion);
    return latest ? join(discordPath, latest, "resources") : null;
};
