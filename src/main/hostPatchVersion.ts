/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure version-number logic for the Windows host patch (see applyHostPatch.ts), with no filesystem or
// Electron dependencies, so it can be unit tested. Discord installs each update into an "app-x.y.z" folder;
// the patch has to find the newest one to re-apply itself to.

export const VERSION_PREFIX = "app-";

const parsePart = (s: string) => parseInt(s, 10) || 0;

/** Whether the "app-x.y.z" folder `$new` is a newer Discord version than `old`, compared numerically. */
export const isNewer = ($new: string, old: string): boolean => {
    const newParts = $new.slice(VERSION_PREFIX.length).split(".").map(parsePart);
    const oldParts = old.slice(VERSION_PREFIX.length).split(".").map(parsePart);
    const len = Math.max(newParts.length, oldParts.length);
    for (let i = 0; i < len; i++) {
        const n = newParts[i] ?? 0;
        const o = oldParts[i] ?? 0;
        if (n > o) return true;
        if (n < o) return false;
    }
    return false;
};
