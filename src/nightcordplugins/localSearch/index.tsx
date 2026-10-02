/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, SnowflakeUtils } from "@webpack/common";

import { IndexedMsg } from "./search";
import { openSearch } from "./SearchModal";
import { flush, index, load } from "./store";

function toIndexed(message: Message): IndexedMsg | null {
    if (!message?.id || !message.content) return null;
    const channel = ChannelStore.getChannel(message.channel_id) as any;
    const author = (message.author ?? {}) as any;
    return {
        id: message.id,
        channelId: message.channel_id,
        guildId: channel?.guild_id,
        authorId: author.id ?? "",
        authorName: author.global_name || author.globalName || author.username || "",
        content: message.content,
        ts: Date.parse((message as any).timestamp) || SnowflakeUtils.extractTimestamp(message.id)
    };
}

export default definePlugin({
    name: "LocalSearch",
    description: "Builds a private local index of the messages you see and searches all of them instantly, even offline, with /find. Nothing leaves your computer",
    tags: ["Chat", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic) return;
            const r = toIndexed(message);
            if (r) index([r]);
        },
        LOAD_MESSAGES_SUCCESS({ messages }: { messages: Message[]; }) {
            if (!Array.isArray(messages)) return;
            index(messages.map(toIndexed).filter((r): r is IndexedMsg => !!r));
        }
    },

    start() {
        void load();
    },

    stop() {
        void flush();
    },

    commands: [{
        name: "find",
        description: "Поиск по всей сохранённой переписке — локально и мгновенно",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: async () => {
            await load();
            openSearch();
        }
    }]
});
