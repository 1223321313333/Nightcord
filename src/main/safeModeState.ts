/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure crash-loop logic for Nightcord safe mode, with no filesystem, IPC or process dependencies,
// so it can be unit tested. The wiring (reading and writing the state file, the IPC handlers) lives
// in safeMode.ts.

/** Failed starts in a row before Nightcord starts with only the required plugins. */
export const FAILED_STARTS_FOR_SAFE_MODE = 3;

/**
 * The stored `failedStarts` value, validated. A tampered or corrupt state file must never make the
 * counter run backwards or go non-numeric, so anything that is not a non-negative integer becomes 0.
 */
export function parseFailedStarts(raw: unknown): number {
    return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : 0;
}

/** Whether this start runs in safe mode: too many failed starts in a row, or the override flag was passed. */
export function isSafeMode(failedStarts: number, forced: boolean, threshold: number = FAILED_STARTS_FOR_SAFE_MODE): boolean {
    return failedStarts >= threshold || forced;
}

/** The count to store at the start of a run: a run counts as failed until the window reports it finished. */
export function countStart(failedStarts: number): number {
    return failedStarts + 1;
}
