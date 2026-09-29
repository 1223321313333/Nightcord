/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Channel } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { saveFile } from "@utils/web";
import { GuildStore, UserStore } from "@webpack/common";

import { describeFetchError, fetchHistory, MAX_HISTORY } from "../_shared/messages";
import { ExportInfo, toHtml, toJson, toTxt } from "./render";

const DEFAULT_COUNT = 1000;
const running = new Set<string>();

function exportInfo(channel: Channel): ExportInfo {
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id)?.name : null;
    let { name } = channel;
    if (!name) {
        // DMs have no name: use the other people's names
        const others = (channel.recipients ?? []).map(id => {
            const u = UserStore.getUser(id) as any;
            return u?.globalName || u?.username;
        }).filter(Boolean);
        name = others.length ? others.join(", ") : "Личные сообщения";
    }
    return {
        title: guild ? `${guild} — #${name}` : name,
        guildId: channel.guild_id ?? null,
        channelId: channel.id
    };
}

const fileSafe = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "chat";

export default definePlugin({
    name: "ChatExport",
    description: "/export saves a channel's history (up to 5000 messages) to an HTML, TXT or JSON file",
    tags: ["Chat", "Commands", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    commands: [{
        name: "export",
        description: "Сохранить историю канала в файл",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "format",
                description: "Формат файла",
                type: ApplicationCommandOptionType.STRING,
                required: false,
                choices: [
                    { name: "html", label: "HTML — как в Discord, с картинками", value: "html" },
                    { name: "txt", label: "TXT — просто текст", value: "txt" },
                    { name: "json", label: "JSON — все данные, для программ", value: "json" }
                ]
            },
            {
                name: "count",
                description: `Сколько последних сообщений сохранить (по умолчанию ${DEFAULT_COUNT}, максимум ${MAX_HISTORY})`,
                type: ApplicationCommandOptionType.INTEGER,
                required: false
            }
        ],
        async execute(args, ctx) {
            const { channel } = ctx;
            const format = findOption(args, "format", "html") as "html" | "txt" | "json";
            const count = Math.max(1, Math.min(MAX_HISTORY, Number(findOption(args, "count", DEFAULT_COUNT)) || DEFAULT_COUNT));

            if (running.has(channel.id)) {
                sendBotMessage(channel.id, { content: "Экспорт этого канала уже идёт, дождитесь его." });
                return;
            }
            running.add(channel.id);

            try {
                if (count > 300) {
                    sendBotMessage(channel.id, { content: `⏳ Загружаю до ${count} сообщений… Это займёт около ${Math.ceil(count / 100 * 0.9)} с.` });
                }

                let messages;
                try {
                    messages = await fetchHistory(channel.id, count);
                } catch (err) {
                    sendBotMessage(channel.id, { content: `❌ Не удалось загрузить историю: ${describeFetchError(err)}.` });
                    return;
                }
                if (!messages.length) {
                    sendBotMessage(channel.id, { content: "В этом канале нет сообщений." });
                    return;
                }

                const info = exportInfo(channel);
                const body = format === "json" ? toJson(info, messages) : format === "txt" ? toTxt(info, messages) : toHtml(info, messages);
                const type = { html: "text/html", txt: "text/plain", json: "application/json" }[format];
                const fileName = `${fileSafe(info.title)}-${new Date().toISOString().slice(0, 10)}.${format}`;

                saveFile(new File([body], fileName, { type: `${type};charset=utf-8` }));
                sendBotMessage(channel.id, {
                    content: `💾 Сохранено **${messages.length}** ${messages.length < count ? "(это вся история канала) " : ""}сообщений в **${fileName}**.`
                });
            } finally {
                running.delete(channel.id);
            }
        }
    }]
});
