/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { avatarUrl, displayName, emojiUrl, escapeHtml, markupToHtml, markupToText, mentionNames, RawAttachment, RawEmbed, RawMessage } from "../_shared/messages";

export interface ExportInfo {
    title: string;
    guildId: string | null;
    channelId: string;
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const fullFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

const GROUP_WINDOW = 7 * 60_000;

/** Message types that render like a normal message (default, reply, slash and context menu commands) */
const NORMAL_TYPES = new Set([0, 19, 20, 23]);

function systemText(m: RawMessage) {
    switch (m.type) {
        case 1: return "добавил участника в группу";
        case 2: return "убрал участника из группы";
        case 3: return "начал звонок";
        case 4: return `переименовал канал: ${m.content}`;
        case 5: return "сменил иконку группы";
        case 6: return "закрепил сообщение";
        case 7: return "присоединился к серверу";
        case 8: case 9: case 10: case 11: return "забустил сервер";
        case 18: return `создал ветку «${m.content || m.thread?.name || ""}»`;
        default: return "системное сообщение";
    }
}

const formatSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

function attachmentHtml(a: RawAttachment) {
    const url = escapeHtml(a.url);
    const type = a.content_type ?? "";
    if (type.startsWith("image/")) return `<a class="att" href="${url}"><img loading="lazy" src="${url}" alt="${escapeHtml(a.filename)}"></a>`;
    if (type.startsWith("video/")) return `<video class="att" controls preload="none" src="${url}"></video>`;
    if (type.startsWith("audio/")) return `<audio class="att" controls preload="none" src="${url}"></audio>`;
    return `<a class="att file" href="${url}">📎 ${escapeHtml(a.filename)} <span>${formatSize(a.size)}</span></a>`;
}

/** Discord's copy of an embed picture, so opening the export does not contact the site the picture came from */
const embedImageUrl = (img: { url: string; proxy_url?: string; }) => img.proxy_url ?? img.url;

function embedHtml(e: RawEmbed, ctx: { guildId: string | null; }) {
    // Plain link previews repeat the link that is already in the text
    if ((e.type === "image" || e.type === "gifv") && (e.thumbnail?.url || e.image?.url)) {
        const src = escapeHtml(embedImageUrl(e.image ?? e.thumbnail!));
        return `<img class="att" loading="lazy" src="${src}" alt="">`;
    }
    if (!e.title && !e.description && !e.fields?.length && !e.image) return "";

    const color = e.color != null ? `#${e.color.toString(16).padStart(6, "0")}` : "var(--muted)";
    const title = e.title
        ? (e.url && /^https?:\/\//.test(e.url) ? `<a class="et" href="${escapeHtml(e.url)}">${escapeHtml(e.title)}</a>` : `<div class="et">${escapeHtml(e.title)}</div>`)
        : "";
    const fields = (e.fields ?? []).map(f => `<div class="ef"><b>${escapeHtml(f.name)}</b><div>${markupToHtml(f.value, ctx)}</div></div>`).join("");
    const image = e.image?.url ? `<img loading="lazy" src="${escapeHtml(embedImageUrl(e.image))}" alt="">` : "";
    return `<div class="embed" style="border-color:${color}">${e.author?.name ? `<div class="ea">${escapeHtml(e.author.name)}</div>` : ""}${title}${e.description ? `<div class="ed">${markupToHtml(e.description, ctx)}</div>` : ""}${fields}${image}${e.footer?.text ? `<div class="eft">${escapeHtml(e.footer.text)}</div>` : ""}</div>`;
}

function reactionsHtml(m: RawMessage) {
    if (!m.reactions?.length) return "";
    return `<div class="reactions">${m.reactions.map(r => {
        const emoji = r.emoji.id ? `<img class="emoji" src="${emojiUrl(r.emoji.id, !!r.emoji.animated)}" alt=":${escapeHtml(r.emoji.name ?? "")}:">` : escapeHtml(r.emoji.name ?? "");
        return `<span>${emoji} ${r.count}</span>`;
    }).join("")}</div>`;
}

function replyHtml(ref: RawMessage, ctx: { guildId: string | null; }) {
    const text = markupToText(ref.content || (ref.attachments?.length ? "📎 вложение" : ref.embeds?.length ? "эмбед" : ""), { ...ctx, users: mentionNames(ref) });
    return `<div class="reply">↪ <b>${escapeHtml(displayName(ref.author))}</b> ${escapeHtml(text.slice(0, 120))}</div>`;
}

export function toHtml(info: ExportInfo, messages: RawMessage[]) {
    const ctx = { guildId: info.guildId };
    const parts: string[] = [];
    let prev: RawMessage | null = null;
    let prevDay = "";

    for (const m of messages) {
        const date = new Date(m.timestamp);
        const day = dateFmt.format(date);
        if (day !== prevDay) {
            parts.push(`<div class="day"><span>${escapeHtml(day)}</span></div>`);
            prevDay = day;
            prev = null;
        }

        if (!NORMAL_TYPES.has(m.type)) {
            parts.push(`<div class="system">→ <b>${escapeHtml(displayName(m.author))}</b> ${escapeHtml(systemText(m))} <span class="time">${escapeHtml(timeFmt.format(date))}</span></div>`);
            prev = null;
            continue;
        }

        const grouped = prev != null && prev.author.id === m.author.id && !m.referenced_message
            && date.getTime() - new Date(prev.timestamp).getTime() < GROUP_WINDOW;
        const content = m.content ? `<div class="text">${markupToHtml(m.content, { ...ctx, users: mentionNames(m) })}${m.edited_timestamp ? ' <span class="edited">(изменено)</span>' : ""}</div>` : "";
        const command = (m.interaction_metadata ?? m.interaction)?.name
            ? `<div class="reply">⌘ ${escapeHtml(displayName((m.interaction_metadata ?? m.interaction)!.user))} использовал /${escapeHtml((m.interaction_metadata ?? m.interaction)!.name!)}</div>`
            : "";
        const body = [
            m.referenced_message ? replyHtml(m.referenced_message, ctx) : "",
            command,
            content,
            ...(m.attachments ?? []).map(attachmentHtml),
            ...(m.embeds ?? []).map(e => embedHtml(e, ctx)),
            ...(m.sticker_items ?? []).map(s => `<div class="sticker">🏷️ стикер «${escapeHtml(s.name)}»</div>`),
            reactionsHtml(m)
        ].join("");

        if (grouped) {
            parts.push(`<div class="msg cont" id="m${m.id}"><span class="hover-time">${escapeHtml(timeFmt.format(date))}</span><div class="body">${body}</div></div>`);
        } else {
            const bot = m.author.bot ? ' <span class="bot">БОТ</span>' : "";
            parts.push(`<div class="msg" id="m${m.id}"><img class="avatar" loading="lazy" src="${escapeHtml(avatarUrl(m.author))}" alt=""><div class="body"><div class="head"><b>${escapeHtml(displayName(m.author))}</b>${bot}<span class="time">${escapeHtml(fullFmt.format(date))}</span></div>${body}</div></div>`);
        }
        prev = m;
    }

    const first = messages[0], last = messages[messages.length - 1];
    const range = first ? `${fullFmt.format(new Date(first.timestamp))} — ${fullFmt.format(new Date(last.timestamp))}` : "";

    return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(info.title)}</title>
<style>
:root{--bg:#1a1b1e;--bg2:#232428;--text:#dbdee1;--muted:#949ba4;--accent:#a78bfa;--line:#2e3035}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.375 "gg sans","Segoe UI",system-ui,sans-serif}
header{position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--line);padding:12px 20px;z-index:1}
header h1{font-size:17px;margin:0}header div{color:var(--muted);font-size:13px;margin-top:2px}
main{max-width:960px;margin:0 auto;padding:8px 0 40px}
.day{display:flex;align-items:center;margin:20px 16px 8px;color:var(--muted);font-size:12px;font-weight:600}
.day::before,.day::after{content:"";flex:1;border-top:1px solid var(--line)}.day span{padding:0 8px}
.msg{display:flex;gap:16px;padding:2px 16px;margin-top:14px;position:relative}.msg:hover{background:#2e30351a}
.msg.cont{margin-top:0}.msg.cont .body{padding-left:56px}
.hover-time{position:absolute;left:16px;top:4px;width:40px;text-align:right;font-size:11px;color:var(--muted);visibility:hidden}.msg.cont:hover .hover-time{visibility:visible}
.avatar{width:40px;height:40px;border-radius:50%;flex:none;margin-top:2px}
.body{min-width:0;flex:1}.head b{font-weight:600}.time{color:var(--muted);font-size:12px;margin-left:8px}
.bot{background:#5865f2;color:#fff;font-size:10px;font-weight:700;padding:1px 4px;border-radius:3px;margin-left:5px;vertical-align:1px}
.text{white-space:pre-wrap;overflow-wrap:anywhere}.edited{color:var(--muted);font-size:11px}
.reply{color:var(--muted);font-size:13px;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reply b{color:var(--text)}
.system{color:var(--muted);padding:6px 16px 6px 72px;font-size:14px}.system b{color:var(--text)}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
code{background:var(--bg2);border-radius:4px;padding:1px 4px;font:13px Consolas,monospace}
pre{background:var(--bg2);border:1px solid var(--line);border-radius:6px;padding:8px;white-space:pre-wrap;margin:4px 0}pre code{background:none;padding:0}
.mention{background:#5865f23d;color:#c9cdfb;border-radius:3px;padding:0 2px}
.spoiler{background:#1e1f22;color:transparent;border-radius:3px;cursor:pointer}.spoiler:hover{color:inherit;background:#ffffff14}
.quote{display:block;border-left:4px solid #4e5058;padding-left:10px}
.h{display:block;font-size:18px;font-weight:700;margin:4px 0}.sub{display:block;font-size:12px;color:var(--muted)}
.emoji{width:22px;height:22px;vertical-align:-5px;object-fit:contain}
.att{display:block;margin-top:6px}.att img,img.att{max-width:min(420px,100%);max-height:320px;border-radius:8px}
video.att{max-width:min(420px,100%);border-radius:8px}
.file{display:inline-block;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:8px 12px}.file span{color:var(--muted);font-size:12px}
.embed{border-left:4px solid;background:var(--bg2);border-radius:4px;padding:8px 12px;margin-top:6px;max-width:520px}
.embed img{max-width:100%;border-radius:4px;margin-top:6px}.ea,.eft{font-size:12px;color:var(--muted)}.et{display:block;font-weight:600;margin:2px 0}
.ed{white-space:pre-wrap;font-size:14px}.ef{font-size:14px;margin-top:4px}
.sticker{color:var(--muted);font-size:13px;margin-top:4px}
.reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.reactions span{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:1px 6px;font-size:13px}
</style></head><body>
<header><h1>${escapeHtml(info.title)}</h1><div>${messages.length} сообщений · ${escapeHtml(range)} · экспорт ${escapeHtml(fullFmt.format(new Date()))} · Nightcord. Ссылки на вложения Discord со временем перестают открываться.</div></header>
<main>
${parts.join("\n")}
</main></body></html>
`;
}

export function toTxt(info: ExportInfo, messages: RawMessage[]) {
    const ctx = { guildId: info.guildId };
    const lines: string[] = [];
    let prevDay = "";
    for (const m of messages) {
        const date = new Date(m.timestamp);
        const day = dateFmt.format(date);
        if (day !== prevDay) {
            lines.push("", `—— ${day} ——`);
            prevDay = day;
        }
        const who = displayName(m.author);
        if (!NORMAL_TYPES.has(m.type)) {
            lines.push(`[${timeFmt.format(date)}] → ${who} ${systemText(m)}`);
            continue;
        }
        const reply = m.referenced_message ? ` (ответ ${displayName(m.referenced_message.author)})` : "";
        const text = markupToText(m.content, { ...ctx, users: mentionNames(m) });
        lines.push(`[${timeFmt.format(date)}] ${who}${reply}: ${text}${m.edited_timestamp ? " (изменено)" : ""}`);
        for (const a of m.attachments ?? []) lines.push(`    📎 ${a.filename}: ${a.url}`);
        for (const e of m.embeds ?? []) {
            if (e.title || e.description) lines.push(`    ▌ ${markupToText([e.title, e.description].filter(Boolean).join(" — "), ctx).slice(0, 300)}`);
        }
        for (const s of m.sticker_items ?? []) lines.push(`    🏷️ стикер «${s.name}»`);
    }
    return `${info.title}\nЭкспорт: ${fullFmt.format(new Date())} · ${messages.length} сообщений · Nightcord\n${lines.join("\n")}\n`;
}

export function toJson(info: ExportInfo, messages: RawMessage[]) {
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        exporter: "Nightcord ChatExport",
        channel: { id: info.channelId, guildId: info.guildId, title: info.title },
        messageCount: messages.length,
        messages
    }, null, 1);
}
