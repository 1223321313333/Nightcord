/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure time-window logic for NightSchedule, with no DOM or settings dependencies, so it can be unit
// tested. The wiring (applying the CSS class, the timer, the toolbox toggle) lives in index.tsx/index.ts.

/** Whether `hour` (0–23) falls inside the night window [start, end). The window wraps past midnight when
 *  start > end (e.g. 23 → 7). Equal start and end means the window is empty, so it is never night. */
export function isNight(hour: number, start: number, end: number): boolean {
    start = Math.round(start);
    end = Math.round(end);
    if (start === end) return false;
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
