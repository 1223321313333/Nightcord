/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { describeFetchError, displayName, fetchHistory, MAX_HISTORY, RawMessage } from "../_shared/messages";

const DEFAULT_COUNT = 500;
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const SPARK = "▁▂▃▄▅▆▇█";

const plural = (n: number, one: string, few: string, many: string) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
};
const messagesWord = (n: number) => plural(n, "сообщение", "сообщения", "сообщений");

function isImage(m: RawMessage) {
    return m.attachments?.some(a => a.content_type?.startsWith("image/"))
        || m.embeds?.some(e => e.type === "image" || e.type === "gifv");
}

/** 24 hourly counts as a one-line bar chart */
function sparkline(values: number[]) {
    const max = Math.max(...values, 1);
    return values.map(v => SPARK[Math.min(SPARK.length - 1, Math.round(v / max * (SPARK.length - 1)))]).join("");
}

export function buildStats(messages: RawMessage[]) {
    const authors = new Map<string, { name: string; bot: boolean; count: number; }>();
    const hours = new Array(24).fill(0);
    const weekdays = new Array(7).fill(0);
    const reactions = new Map<string, number>();
    let links = 0, images = 0, files = 0, chars = 0, withText = 0;

    for (const m of messages) {
        const entry = authors.get(m.author.id) ?? { name: displayName(m.author), bot: !!m.author.bot, count: 0 };
        entry.count++;
        authors.set(m.author.id, entry);

        const date = new Date(m.timestamp);
        hours[date.getHours()]++;
        weekdays[date.getDay()]++;

        links += m.content.match(/https?:\/\/\S+/g)?.length ?? 0;
        if (isImage(m)) images++;
        files += m.attachments?.length ?? 0;
        if (m.content) {
            chars += m.content.length;
            withText++;
        }
        for (const r of m.reactions ?? []) {
            const key = r.emoji.id ? `:${r.emoji.name}:` : r.emoji.name ?? "?";
            reactions.set(key, (reactions.get(key) ?? 0) + r.count);
        }
    }

    const n = messages.length;
    const first = new Date(messages[0].timestamp);
    const last = new Date(messages[n - 1].timestamp);
    const days = Math.max(1, (last.getTime() - first.getTime()) / 86_400_000);
    const fmt = (d: Date) => d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

    const top = [...authors.values()].sort((a, b) => b.count - a.count).slice(0, 10);
    const peakHour = hours.indexOf(Math.max(...hours));
    const peakDay = weekdays.indexOf(Math.max(...weekdays));
    const topReactions = [...reactions].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const lines = [
        `📊 **Статистика канала** · последние ${n} ${messagesWord(n)}`,
        `${fmt(first)} — ${fmt(last)} · в среднем **${(n / days).toLocaleString("ru-RU", { maximumFractionDigits: n / days < 10 ? 1 : 0 })}** в день`,
        `Писали: **${authors.size}** · ссылок: **${links}** · с картинками: **${images}** · файлов: **${files}**`,
        `Средняя длина сообщения: **${withText ? Math.round(chars / withText) : 0}** символов`,
        "",
        "**Больше всех пишут:**",
        ...top.map((a, i) => `${i + 1}. ${a.name}${a.bot ? " 🤖" : ""} — ${a.count} ${messagesWord(a.count)} (${Math.round(a.count / n * 100)}%)`),
        "",
        `**Активность по часам** (0–23): \`${sparkline(hours)}\``,
        `Пик: **${peakHour}:00–${(peakHour + 1) % 24}:00** · самый активный день: **${WEEKDAYS[peakDay]}**`
    ];
    if (topReactions.length) {
        lines.push(`**Реакции:** ${topReactions.map(([emoji, count]) => `${emoji} ${count}`).join(" · ")}`);
    }
    return lines.join("\n");
}

const running = new Set<string>();

export default definePlugin({
    name: "ChatStats",
    description: "/stats shows who writes the most in a channel, when it is active, and counts of links, images and reactions",
    tags: ["Chat", "Commands", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    commands: [{
        name: "stats",
        description: "Статистика текущего канала",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "count",
            description: `По скольким последним сообщениям считать (по умолчанию ${DEFAULT_COUNT}, максимум ${MAX_HISTORY})`,
            type: ApplicationCommandOptionType.INTEGER,
            required: false
        }],
        async execute(args, ctx) {
            const channelId = ctx.channel.id;
            const count = Math.max(1, Math.min(MAX_HISTORY, Number(findOption(args, "count", DEFAULT_COUNT)) || DEFAULT_COUNT));
            if (running.has(channelId)) return;
            running.add(channelId);

            try {
                if (count > 300) sendBotMessage(channelId, { content: `⏳ Считаю по ${count} сообщениям…` });
                const messages = await fetchHistory(channelId, count);
                sendBotMessage(channelId, { content: messages.length ? buildStats(messages) : "В этом канале нет сообщений." });
            } catch (err) {
                sendBotMessage(channelId, { content: `❌ Не удалось загрузить историю: ${describeFetchError(err)}.` });
            } finally {
                running.delete(channelId);
            }
        }
    }]
});
