/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Shared core of "Sync through your Discord" (src/.../DiscordSync.tsx) and the weekly automatic backup
// (src/utils/autoBackup.ts): build the password-encrypted file and post it to a channel the user owns.

import * as DataStore from "@api/DataStore";
import { CloudUploadPlatform } from "@nightcord/discord-types/enums";
import { t } from "@utils/i18n";
import { encryptBackup } from "@utils/syncCrypto";
import { CloudUploader, Constants, RestAPI, SnowflakeUtils } from "@webpack/common";

export const CHANNEL_KEY = "Nightcord_SyncChannel";
export const AUTO_KEY = "Nightcord_AutoBackup";
/** The backup password, kept on this computer so the weekly copy can be made without asking every time */
export const AUTO_PW_KEY = "Nightcord_AutoBackupPassword";
export const AUTO_AT_KEY = "Nightcord_AutoBackupAt";
export const FILE_NAME = "nightcord-settings.ncsync";
export const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Nightcord's own user data that belongs in the backup. Not the SecretChat keys or saved deleted messages. */
const SYNCED_KEYS = ["Nightcord_Bookmarks", "Nightcord_ChannelNotes", "Nightcord_DisappearingTimers"];

/** Collect settings, QuickCSS and the synced DataStore keys and seal them with the password. */
export async function buildBackupFile(password: string): Promise<Uint8Array<ArrayBuffer>> {
    const dataStore: [string, unknown][] = [];
    for (const key of SYNCED_KEYS) {
        const value = await DataStore.get(key);
        if (value !== undefined) dataStore.push([key, value]);
    }
    const json = JSON.stringify({
        settings: NightcordNative.settings.get(),
        quickCss: await NightcordNative.quickCss.get(),
        dataStore
    });
    return encryptBackup(json, password);
}

/** Build the backup and post it as an attachment in the given channel. Throws on failure. */
export async function backupNow(channelId: string, password: string): Promise<void> {
    const file = await buildBackupFile(password);

    const upload = new CloudUploader({
        file: new File([file], FILE_NAME, { type: "application/octet-stream" }),
        isThumbnail: false,
        platform: CloudUploadPlatform.WEB
    }, channelId);
    await new Promise<void>((resolve, reject) => {
        upload.on("complete", () => resolve());
        upload.on("error", () => reject(new Error("upload failed")));
        upload.upload();
    });
    await RestAPI.post({
        url: Constants.Endpoints.MESSAGES(channelId),
        body: {
            content: "🌙 Nightcord: " + t("encrypted settings backup"),
            nonce: SnowflakeUtils.fromTimestamp(Date.now()),
            attachments: [{ id: "0", filename: upload.filename, uploaded_filename: upload.uploadedFilename }]
        }
    });
}
