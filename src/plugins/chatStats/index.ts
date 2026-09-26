/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageStore } from "@webpack/common";

const plural = (n: number, one: string, few: string, many: string) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
};

export function getLoadedMessages(channelId: string): Message[] {
    return MessageStore.getMessages(channelId)?._array ?? [];
}

function isImage(msg: Message) {
    return msg.attachments?.some(a => a.content_type?.startsWith("image/"))
        || msg.embeds?.some(e => (e as any).type === "image" || (e as any).type === "gifv");
}

function buildStats(messages: Message[]) {
    const authors = new Map<string, { name: string; count: number; }>();
    let links = 0, images = 0, attachments = 0;

    for (const msg of messages) {
        const name = (msg.author as any).globalName ?? msg.author.username;
        const entry = authors.get(msg.author.id) ?? { name, count: 0 };
        entry.count++;
        authors.set(msg.author.id, entry);

        links += msg.content?.match(/https?:\/\/\S+/g)?.length ?? 0;
        if (isImage(msg)) images++;
        attachments += msg.attachments?.length ?? 0;
    }

    const top = [...authors.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const first = new Date(messages[0].timestamp as any);
    const last = new Date(messages[messages.length - 1].timestamp as any);
    const fmt = (d: Date) => d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
    const n = messages.length;

    return [
        "📊 **Статистика загруженной части канала**",
        `Сообщений: **${n}** (с ${fmt(first)} по ${fmt(last)})`,
        `Участников писало: **${authors.size}**`,
        `Ссылок: **${links}** · Сообщений с картинками: **${images}** · Файлов: **${attachments}**`,
        "",
        "**Больше всех пишут:**",
        ...top.map((a, i) => `${i + 1}. ${a.name} — ${a.count} ${plural(a.count, "сообщение", "сообщения", "сообщений")} (${Math.round(a.count / n * 100)}%)`),
        "",
        "-# Считаются только сообщения, уже загруженные в клиенте. Прокрутите чат вверх, чтобы охватить больше."
    ].join("\n");
}

export default definePlugin({
    name: "ChatStats",
    description: "/stats shows who writes the most in the current channel, plus counts of messages, links and images",
    tags: ["Chat", "Commands", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    commands: [{
        name: "stats",
        description: "Статистика текущего канала (по загруженным сообщениям)",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: (_, ctx) => {
            const messages = getLoadedMessages(ctx.channel.id);
            sendBotMessage(ctx.channel.id, {
                content: messages.length ? buildStats(messages) : "В этом канале пока нет загруженных сообщений."
            });
        }
    }]
});
