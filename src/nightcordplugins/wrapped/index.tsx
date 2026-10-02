/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { SnowflakeUtils, UserStore } from "@webpack/common";

import { load, recordMessage, recordReaction, reset } from "./tracker";
import { openWrapped } from "./Wrapped";

function isImage(message: Message): boolean {
    return (message.attachments ?? []).some((a: any) => a.content_type?.startsWith("image/"))
        || (message.embeds ?? []).some((e: any) => e.type === "image" || e.type === "gifv");
}

function messageTime(message: Message): number {
    const t = Date.parse((message as any).timestamp);
    return Number.isNaN(t) ? SnowflakeUtils.extractTimestamp(message.id) : t;
}

export default definePlugin({
    name: "Wrapped",
    description: "A personal \"year in review\": counts your own activity locally and shows it as a shareable recap card. Open it with /wrapped",
    tags: ["Chat", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic || !message?.id) return;
            if (message.author?.id !== UserStore.getCurrentUser()?.id) return;
            recordMessage({
                ts: messageTime(message),
                channelId: message.channel_id,
                content: message.content ?? "",
                attachments: message.attachments?.length ?? 0,
                isImage: isImage(message)
            });
        },
        MESSAGE_REACTION_ADD({ userId, optimistic }: { userId: string; optimistic?: boolean; }) {
            if (optimistic) return;
            if (userId === UserStore.getCurrentUser()?.id) recordReaction();
        }
    },

    start() {
        void load();
    },

    commands: [{
        name: "wrapped",
        description: "Показать ваш «Год в Nightcord» — личную статистику",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: async () => {
            await load();
            openWrapped(reset);
        }
    }]
});
