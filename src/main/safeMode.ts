/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord safe mode. Every Discord start counts as failed until the window reports it has run for a while
// (the renderer calls STARTUP_OK). After FAILED_STARTS_FOR_SAFE_MODE failed starts in a row, Discord starts with only
// the required plugins, and stays that way until the user turns plugins back on (RESET_STARTUP), so a plugin that
// crashes Discord cannot lock the user out.

import { IpcEvents } from "@shared/IpcEvents";
import { ipcMain } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { SETTINGS_DIR } from "./utils/constants";

const STATE_FILE = join(SETTINGS_DIR, "startup.json");
const FAILED_STARTS_FOR_SAFE_MODE = 3;

function read(): number {
    try {
        const n = JSON.parse(readFileSync(STATE_FILE, "utf8")).failedStarts;
        return Number.isInteger(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
}

function write(failedStarts: number) {
    try {
        mkdirSync(SETTINGS_DIR, { recursive: true });
        writeFileSync(STATE_FILE, JSON.stringify({ failedStarts }));
    } catch (err) {
        console.error("[Nightcord] Could not save the startup state", err);
    }
}

const failedStarts = read();
const safeMode = failedStarts >= FAILED_STARTS_FOR_SAFE_MODE || process.argv.includes("--nightcord-safe-mode");

// this start counts as failed until the window says otherwise
write(failedStarts + 1);
if (safeMode) console.warn(`[Nightcord] Safe mode: ${failedStarts} starts in a row did not finish, plugins stay off`);

ipcMain.on(IpcEvents.GET_STARTUP_STATE, e => {
    e.returnValue = { safeMode, failedStarts };
});

// In safe mode a good start does not count: the problem is still there once plugins are back
ipcMain.handle(IpcEvents.STARTUP_OK, () => {
    if (!safeMode) write(0);
});

ipcMain.handle(IpcEvents.RESET_STARTUP, () => write(0));
