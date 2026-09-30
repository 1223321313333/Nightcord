/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Helpers shared by Nightcord's message plugins (ChatExport, ChatStats, Bookmarks).
// The folder starts with "_" so the build does not treat it as a plugin.

import { ChannelStore, Constants, GuildRoleStore, RestAPI, UserStore } from "@webpack/common";

/** A message as the Discord API returns it (not a MessageStore record) */
export interface RawUser {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    bot?: boolean;
}

export interface RawAttachment {
    id: string;
    filename: string;
    url: string;
    size: number;
    content_type?: string;
    width?: number;
    height?: number;
}

export interface RawEmbed {
    type?: string;
    url?: string;
    title?: string;
    description?: string;
    color?: number;
    author?: { name?: string; };
    image?: { url: string; proxy_url?: string; };
    thumbnail?: { url: string; proxy_url?: string; };
    video?: { url: string; };
    fields?: { name: string; value: string; }[];
    footer?: { text?: string; };
}

export interface RawMessage {
    id: string;
    channel_id: string;
    type: number;
    author: RawUser;
    content: string;
    timestamp: string;
    edited_timestamp?: string | null;
    attachments?: RawAttachment[];
    embeds?: RawEmbed[];
    mentions?: RawUser[];
    referenced_message?: RawMessage | null;
    sticker_items?: { id: string; name: string; }[];
    reactions?: { emoji: { id: string | null; name: string | null; animated?: boolean; }; count: number; }[];
    interaction_metadata?: { name?: string; user?: RawUser; } | null;
    interaction?: { name?: string; user?: RawUser; } | null;
    thread?: { name?: string; } | null;
}

export const MAX_HISTORY = 5000;
const PAGE = 100;
// Discord's own client loads 50 messages per scroll step; one page of 100 per ~0.8s stays in that range
const PAGE_DELAY = 800;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Loads up to `limit` of the latest messages of a channel, oldest first.
 * Pages through the history like scrolling up does, at a gentle pace.
 */
export async function fetchHistory(channelId: string, limit: number, onProgress?: (loaded: number) => void): Promise<RawMessage[]> {
    limit = Math.max(1, Math.min(MAX_HISTORY, Math.floor(limit)));
    const out: RawMessage[] = [];
    let before: string | undefined;

    while (out.length < limit) {
        const res = await RestAPI.get({
            url: Constants.Endpoints.MESSAGES(channelId),
            query: { limit: Math.min(PAGE, limit - out.length), ...(before ? { before } : {}) },
            retries: 2
        });
        const page = (res.body ?? []) as RawMessage[];
        out.push(...page);
        onProgress?.(out.length);

        if (page.length < PAGE) break;
        before = page[page.length - 1].id;
        await sleep(PAGE_DELAY);
    }

    return out.reverse();
}

/** Why a history request failed, in words a user understands */
export function describeFetchError(err: any) {
    const status = err?.status ?? err?.body?.status;
    if (status === 403 || err?.body?.code === 50001 || err?.body?.code === 50013) return "нет доступа к истории этого канала";
    if (status === 429) return "Discord просит подождать (слишком много запросов), попробуйте через минуту";
    if (status == null) return "нет связи с Discord";
    return `Discord ответил ошибкой ${status}`;
}

export const displayName = (u: RawUser | undefined | null) => u?.global_name || u?.username || "неизвестный";

export function avatarUrl(u: RawUser, size = 64) {
    if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=${size}`;
    const index = /^\d+$/.test(u.id) ? Number((BigInt(u.id) >> 22n) % 6n) : 0;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export const emojiUrl = (id: string, animated: boolean) => `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=48`;

export interface MarkupContext {
    guildId?: string | null;
    /** Names of users mentioned in the message, from the API response */
    users?: Map<string, string>;
}

function userName(id: string, ctx: MarkupContext) {
    const known = ctx.users?.get(id);
    if (known) return known;
    const user = UserStore.getUser(id) as any;
    return user?.globalName || user?.username || "пользователь";
}

function roleName(id: string, ctx: MarkupContext) {
    return (ctx.guildId && GuildRoleStore.getRole(ctx.guildId, id)?.name) || "роль";
}

const channelName = (id: string) => ChannelStore.getChannel(id)?.name || "канал";

const timestampText = (seconds: string, style?: string) => {
    const date = new Date(Number(seconds) * 1000);
    if (Number.isNaN(date.getTime())) return seconds;
    return style === "t" || style === "T"
        ? date.toLocaleTimeString("ru-RU")
        : style === "d" || style === "D"
            ? date.toLocaleDateString("ru-RU")
            : date.toLocaleString("ru-RU");
};

/** Discord markup (<@id>, <#id>, <@&id>, <:emoji:id>, <t:unix>, </cmd:id>) as plain readable text */
export function markupToText(content: string, ctx: MarkupContext = {}) {
    return content
        .replace(/<@!?(\d+)>/g, (_, id) => "@" + userName(id, ctx))
        .replace(/<@&(\d+)>/g, (_, id) => "@" + roleName(id, ctx))
        .replace(/<#(\d+)>/g, (_, id) => "#" + channelName(id))
        .replace(/<a?:(\w+):\d+>/g, ":$1:")
        .replace(/<t:(-?\d+)(?::([tTdDfFR]))?>/g, (_, s, style) => timestampText(s, style))
        .replace(/<\/([\w -]+):\d+>/g, "/$1");
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const safeUrl = (url: string) => /^https?:\/\//i.test(url) ? escapeHtml(url) : null;

/**
 * Discord markup and markdown as HTML. Everything is escaped first; only the tags added here are HTML.
 * Covers what people actually use in chats: code, bold/italic/underline/strike, spoilers, quotes,
 * headers, mentions, custom emoji, timestamps and links.
 */
export function markupToHtml(content: string, ctx: MarkupContext = {}) {
    const stash: string[] = [];
    const keep = (html: string) => `\u0000${stash.push(html) - 1}\u0000`;

    let s = content
        // code first, nothing inside it is formatted
        .replace(/```(?:([\w+-]{1,20})\n)?([\s\S]*?)```/g, (_, _lang, code) => keep(`<pre><code>${escapeHtml(code.replace(/^\n/, ""))}</code></pre>`))
        .replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`))
        // Discord entities, before escaping turns < > into entities
        .replace(/<@!?(\d+)>/g, (_, id) => keep(`<span class="mention">@${escapeHtml(userName(id, ctx))}</span>`))
        .replace(/<@&(\d+)>/g, (_, id) => keep(`<span class="mention">@${escapeHtml(roleName(id, ctx))}</span>`))
        .replace(/<#(\d+)>/g, (_, id) => keep(`<span class="mention">#${escapeHtml(channelName(id))}</span>`))
        .replace(/<(a?):(\w+):(\d+)>/g, (_, a, name, id) => keep(`<img class="emoji" src="${emojiUrl(id, !!a)}" alt=":${escapeHtml(name)}:" title=":${escapeHtml(name)}:">`))
        .replace(/<t:(-?\d+)(?::([tTdDfFR]))?>/g, (_, sec, style) => keep(`<span class="ts">${escapeHtml(timestampText(sec, style))}</span>`))
        .replace(/<\/([\w -]+):\d+>/g, (_, name) => keep(`<span class="mention">/${escapeHtml(name)}</span>`))
        // masked links [text](url) and bare links
        .replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, (m, text, url) => {
            const href = safeUrl(url);
            return href ? keep(`<a href="${href}" rel="noreferrer">${escapeHtml(text)}</a>`) : m;
        })
        .replace(/<?(https?:\/\/[^\s<>]+[^\s<>.,:;"')\]])>?/g, (_, url) => keep(`<a href="${escapeHtml(url)}" rel="noreferrer">${escapeHtml(url)}</a>`));

    s = escapeHtml(s)
        .replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler">$1</span>')
        .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "<b><i>$1</i></b>")
        .replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>")
        .replace(/__([\s\S]+?)__/g, "<u>$1</u>")
        .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, "$1<i>$2</i>")
        .replace(/(^|[^_\w])_(?!\s)([^_\n]+?)_(?![_\w])/g, "$1<i>$2</i>")
        .replace(/~~([\s\S]+?)~~/g, "<s>$1</s>")
        .replace(/^#{1,3} (.+)$/gm, '<div class="h">$1</div>')
        .replace(/^-# (.+)$/gm, '<div class="sub">$1</div>')
        .replace(/^&gt; (.*)$/gm, '<div class="quote">$1</div>');

    for (let i = 0; i < 3 && s.includes("\u0000"); i++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => stash[+n]);
    // Block elements already start a new line, so drop the line break after them like Discord does
    return s.replace(/(<\/pre>|<\/div>)\n/g, "$1");
}

/** Map of user id to display name for the users a raw message mentions */
export function mentionNames(msg: RawMessage) {
    const map = new Map<string, string>();
    for (const u of msg.mentions ?? []) map.set(u.id, displayName(u));
    return map;
}
