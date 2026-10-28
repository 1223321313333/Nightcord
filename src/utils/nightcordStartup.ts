/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { showStartupModals } from "@components/settings/tabs/nightcord/Welcome";

import { scheduleAutoBackup } from "./autoBackup";
import { t } from "./i18n";
import { leaveSafeMode, STARTUP } from "./safeMode";

// Nightcord's own startup steps, run by init() in Nightcord.ts once settings are synced. A single call there keeps
// that file close to Equicord's, so syncing with Equicord does not conflict over it.
export function runNightcordStartup() {
    // welcome window after installing, "what's new" after an update
    void showStartupModals();

    // weekly encrypted settings backup to the user's own Discord, if they turned it on
    void scheduleAutoBackup();

    // safe mode: tell the user why their plugins are off and how to get them back
    if (STARTUP.safeMode) {
        setTimeout(() => showNotice(
            // t() and not the UI translator: RussianNightcord is a plugin, so it is off too
            t("Discord did not start properly several times in a row, so Nightcord started without plugins. If a plugin was the cause, turn it off in Nightcord settings before turning plugins back on."),
            t("Turn plugins back on"),
            () => leaveSafeMode()
        ), 3000);
    }
}
