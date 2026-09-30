/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Renderer side of Nightcord safe mode (see src/main/safeMode.ts)

/** How long the window has to run before the start counts as good */
const GOOD_START_AFTER = 20_000;

function readState(): { safeMode: boolean; failedStarts: number; firstRun?: boolean; } {
    try {
        return IS_DISCORD_DESKTOP
            ? NightcordNative.native.getStartupState?.() ?? { safeMode: false, failedStarts: 0 }
            : { safeMode: false, failedStarts: 0 };
    } catch {
        return { safeMode: false, failedStarts: 0 };
    }
}

export const STARTUP = readState();

if (IS_DISCORD_DESKTOP) {
    setTimeout(() => NightcordNative.native.startupOk?.().catch(() => { }), GOOD_START_AFTER);
}

/** Turns plugins back on for the next start and restarts Discord */
export async function leaveSafeMode() {
    await NightcordNative.native.resetStartup?.();
    const { relaunch } = await import("./native");
    relaunch();
}
