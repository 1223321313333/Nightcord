/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Channel, Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { saveFile } from "@utils/web";
import { GuildStore, MessageStore } from "@webpack/common";

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const authorName = (m: Message) => (m.author as any).globalName ?? m.author.username;
const time = (m: Message) => new Date(m.timestamp as any).toLocaleString("ru-RU");

function channelTitle(channel: Channel) {
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id)?.name : null;
    const name = channel.name || "ЛС";
    return guild ? `${guild} — #${name}` : name;
}

function toTxt(channel: Channel, messages: Message[]) {
    const lines = messages.map(m => {
        const files = m.attachments?.map(a => `\n    📎 ${a.filename}: ${a.url}`).join("") ?? "";
        return `[${time(m)}] ${authorName(m)}: ${m.content}${files}`;
    });
    return `${channelTitle(channel)}\nЭкспорт: ${new Date().toLocaleString("ru-RU")} · ${messages.length} сообщений\n\n${lines.join("\n")}\n`;
}

function toHtml(channel: Channel, messages: Message[]) {
    const rows = messages.map(m => {
        const files = m.attachments?.map(a =>
            a.content_type?.startsWith("image/")
                ? `<a href="${esc(a.url)}"><img src="${esc(a.url)}" alt="${esc(a.filename)}"></a>`
                : `<a class="file" href="${esc(a.url)}">📎 ${esc(a.filename)}</a>`
        ).join("") ?? "";
        const content = esc(m.content).replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}">${u}</a>`);
        return `<div class="msg"><div class="meta"><b>${esc(authorName(m))}</b> <span>${esc(time(m))}</span></div><div class="text">${content}</div>${files}</div>`;
    }).join("\n");

    return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${esc(channelTitle(channel))}</title>
<style>
body{margin:0;background:#14151c;color:#dcddde;font:15px/1.45 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px}
h1{font-size:20px;margin:0 0 4px}.sub{color:#8e9297;margin-bottom:20px}
.msg{padding:8px 0;border-bottom:1px solid #22232d}.meta span{color:#8e9297;font-size:12px;margin-left:6px}
.text{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#a78bfa}img{max-width:320px;max-height:240px;border-radius:6px;margin-top:6px;display:block}
.file{display:inline-block;margin-top:6px}
</style></head><body><main>
<h1>${esc(channelTitle(channel))}</h1>
<div class="sub">Экспорт: ${esc(new Date().toLocaleString("ru-RU"))} · ${messages.length} сообщений · Nightcord</div>
${rows}
</main></body></html>
`;
}

export default definePlugin({
    name: "ChatExport",
    description: "/export saves the loaded messages of the current channel to an HTML or TXT file",
    tags: ["Chat", "Commands", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    commands: [{
        name: "export",
        description: "Сохранить загруженные сообщения канала в файл",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "format",
            description: "Формат файла",
            type: ApplicationCommandOptionType.STRING,
            required: false,
            choices: [
                { name: "html", label: "HTML (красиво, с картинками)", value: "html" },
                { name: "txt", label: "TXT (просто текст)", value: "txt" }
            ]
        }],
        execute: (args, ctx) => {
            const format = findOption(args, "format", "html");
            const messages = MessageStore.getMessages(ctx.channel.id)?._array ?? [];
            if (!messages.length) {
                sendBotMessage(ctx.channel.id, { content: "Нечего экспортировать: в канале нет загруженных сообщений." });
                return;
            }

            const safeName = (ctx.channel.name || "dm").replace(/[^\p{L}\p{N}_-]+/gu, "_");
            const date = new Date().toISOString().slice(0, 10);
            const isHtml = format === "html";
            const body = isHtml ? toHtml(ctx.channel, messages) : toTxt(ctx.channel, messages);

            saveFile(new File([body], `${safeName}-${date}.${isHtml ? "html" : "txt"}`, {
                type: isHtml ? "text/html" : "text/plain"
            }));

            sendBotMessage(ctx.channel.id, {
                content: `💾 Сохранено сообщений: **${messages.length}** (${format.toUpperCase()}). Прокрутите чат вверх и повторите, чтобы захватить больше.`
            });
        }
    }]
});
