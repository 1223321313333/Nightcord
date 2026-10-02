/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The weekly automatic backup. When the user turned it on in "Sync through your Discord", this posts a fresh
// encrypted copy to their channel once a week, silently, so nobody loses their settings. The UI lives in
// src/components/settings/tabs/sync/DiscordSync.tsx; the actual work is shared in that folder's backup.ts.

import * as DataStore from "@api/DataStore";
import { AUTO_AT_KEY, AUTO_KEY, AUTO_PW_KEY, backupNow, CHANNEL_KEY, WEEK } from "@components/settings/tabs/sync/backup";
import { UserStore } from "@webpack/common";

import { Logger } from "./Logger";

const logger = new Logger("AutoBackup");
const SIX_HOURS = 6 * 60 * 60 * 1000;

async function runIfDue() {
    try {
        if (!await DataStore.get(AUTO_KEY)) return;
        const channelId = await DataStore.get<string>(CHANNEL_KEY);
        const password = await DataStore.get<string>(AUTO_PW_KEY);
        if (!channelId || !password) return;

        const last = (await DataStore.get<number>(AUTO_AT_KEY)) ?? 0;
        if (Date.now() - last < WEEK) return;

        await backupNow(channelId, password);
        await DataStore.set(AUTO_AT_KEY, Date.now());
        logger.info("Weekly backup posted to your Discord server");
    } catch (err) {
        logger.error("Weekly backup failed; will try again later", err);
    }
}

/** Waits for login, makes a backup if one is overdue, then keeps checking for long-running sessions. */
export async function scheduleAutoBackup() {
    for (let i = 0; !UserStore.getCurrentUser(); i++) {
        if (i > 600) return;
        await new Promise(r => setTimeout(r, 2000));
    }
    await runIfDue();
    setInterval(runIfDue, SIX_HOURS);
}
