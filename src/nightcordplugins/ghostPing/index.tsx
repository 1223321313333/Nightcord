/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore, NavigationRouter, UserStore } from "@webpack/common";

import { pingsMe } from "./detect";

/** How long after a ping its deletion still counts as a ghost ping */
const WINDOW = 10 * 60 * 1000;
const MAX = 500;

interface Pending { author: string; content: string; channelId: string; guildId?: string; at: number; }
const pending = new Map<string, Pending>();

function prune(now: number) {
    for (const [id, p] of pending) {
        if (now - p.at > WINDOW) pending.delete(id);
    }
    while (pending.size > MAX) pending.delete(pending.keys().next().value!);
}

function displayName(author: any): string {
    return author?.global_name || author?.globalName || author?.username || "кто-то";
}

function where(channelId: string, guildId?: string): string {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "";
    if (!guildId || channel.isDM?.() || channel.isGroupDM?.()) return "в личных сообщениях";
    const guild = GuildStore.getGuild(guildId);
    return `${guild?.name ?? "сервер"} · #${channel.name}`;
}

export default definePlugin({
    name: "GhostPing",
    description: "Tells you when someone pinged or replied to you and then quickly deleted the message, so you do not miss it",
    tags: ["Notifications", "Chat"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message & { guild_id?: string; }; optimistic: boolean; }) {
            if (optimistic || !message?.id) return;
            const me = UserStore.getCurrentUser()?.id;
            if (!me || message.author?.id === me || (message.author as any)?.bot) return;
            if (!pingsMe(message as any, me)) return;

            const now = Date.now();
            pending.set(message.id, {
                author: displayName(message.author),
                content: message.content || "",
                channelId: message.channel_id,
                guildId: message.guild_id,
                at: now
            });
            prune(now);
        },

        MESSAGE_DELETE({ id }: { id: string; }) {
            const hit = pending.get(id);
            if (!hit) return;
            pending.delete(id);

            const place = where(hit.channelId, hit.guildId);
            const text = hit.content.trim() || "(без текста — вложение, эмодзи или только упоминание)";
            void showNotification({
                title: `👻 ${hit.author} упомянул вас и удалил`,
                body: place ? `${place}\n${text}` : text,
                onClick: () => NavigationRouter.transitionTo(`/channels/${hit.guildId ?? "@me"}/${hit.channelId}`)
            });
        }
    },

    stop() {
        pending.clear();
    }
});
