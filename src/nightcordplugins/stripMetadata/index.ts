/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { CloudUpload } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Toasts } from "@webpack/common";

import { Removed, stripMetadata } from "./strip";

const logger = new Logger("StripMetadata");

const settings = definePluginSettings({
    images: {
        type: OptionType.BOOLEAN,
        description: "Remove metadata from photos (JPEG, PNG, WebP): GPS location, camera model, dates, editing software",
        default: true
    },
    videos: {
        type: OptionType.BOOLEAN,
        description: "Remove location and device model from videos (MP4, MOV)",
        default: true
    },
    notify: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when a file contained a location",
        default: true
    }
});

function notifyRemoved(removed: Set<Removed>, fileName: string) {
    if (!settings.store.notify || !removed.has("location")) return;
    Toasts.show({
        message: `📍 Из «${fileName}» удалены координаты места съёмки`,
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId()
    });
}

/**
 * The file without sensitive metadata, or the same file if there was nothing to remove or the plugin is off.
 * Also used by FileUpload, so files sent to other hosts are cleaned too.
 */
export async function stripForUpload<T extends Blob>(file: T, fileName = (file as unknown as File).name ?? "file"): Promise<T | File> {
    if (!Settings.plugins.StripMetadata?.enabled) return file;
    try {
        const result = await stripMetadata(file, settings.store);
        if (!result) return file;
        logger.info(`${fileName}: removed ${[...result.removed].join(", ")}`);
        notifyRemoved(result.removed, fileName);
        return new File([result.blob], fileName, { type: file.type, lastModified: (file as unknown as File).lastModified });
    } catch (err) {
        // Never block an upload because of metadata; send the original instead
        logger.warn(`Could not clean ${fileName}, uploading it unchanged`, err);
        return file;
    }
}

export default definePlugin({
    name: "StripMetadata",
    description: "Removes GPS location, camera model and other metadata from photos and videos before they are uploaded",
    tags: ["Privacy", "Media"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,

    patches: [
        {
            find: "async uploadFiles(",
            replacement: {
                match: /async uploadFiles\((\i)\){/,
                replace: "$&await $self.stripUploads($1);"
            }
        }
    ],

    async stripUploads(uploads: CloudUpload[]) {
        await Promise.all((uploads ?? []).map(async upload => {
            const file = upload?.item?.file;
            if (!file) return;
            const cleaned = await stripForUpload(file, file.name);
            if (cleaned === file) return;
            // Same as Discord does after converting an image
            upload.item.file = cleaned as File;
            upload.currentSize = cleaned.size;
            upload.preCompressionSize = cleaned.size;
        }));
    }
});
