/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ApplicationCommandInputType } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import ErrorBoundary from "@components/ErrorBoundary";
import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin, { IconComponent } from "@utils/types";
import { ChannelStore, GuildStore, Menu, Modal, NavigationRouter, openModal, React, TextInput, Toasts, useEffect, UserStore, useState } from "@webpack/common";

import { markupToText } from "../_shared/messages";

const KEY = "Nightcord_Bookmarks";

interface Bookmark {
    id: string;
    channelId: string;
    guildId: string | null;
    author: string;
    avatar: string;
    content: string;
    timestamp: number;
    savedAt: number;
    /** Remembered when saving, so the list still makes sense if the channel is gone */
    channelName?: string;
    guildName?: string;
}

let cache: Bookmark[] = [];
const listeners = new Set<() => void>();
// Every change waits for the first load, so an early bookmark can never overwrite the saved list
let ready: Promise<void> = Promise.resolve();

function load() {
    ready = DataStore.get<Bookmark[]>(KEY).then(list => { cache = list ?? []; });
    return ready;
}

async function change(updater: (list: Bookmark[]) => Bookmark[]) {
    await ready;
    let next: Bookmark[] = cache;
    await DataStore.update<Bookmark[]>(KEY, old => (next = updater(old ?? [])));
    cache = next;
    listeners.forEach(l => l());
}

const isBookmarked = (id: string) => cache.some(b => b.id === id);

function toast(message: string, type = Toasts.Type.SUCCESS) {
    Toasts.show({ message, type, id: Toasts.genId() });
}

function channelLabel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return undefined;
    if (channel.name) return `#${channel.name}`;
    const names = (channel.recipients ?? []).map(id => {
        const u = UserStore.getUser(id) as any;
        return u?.globalName || u?.username;
    }).filter(Boolean);
    return names.length ? `ЛС: ${names.join(", ")}` : "ЛС";
}

function describe(msg: Message, guildId: string | null) {
    const text = markupToText(msg.content ?? "", { guildId }).trim();
    if (text) return text;
    const files = msg.attachments?.map(a => a.filename);
    if (files?.length) return `📎 ${files.join(", ")}`;
    const embed = msg.embeds?.[0] as any;
    const embedText = embed?.rawTitle ?? embed?.title ?? embed?.rawDescription ?? embed?.description;
    if (embedText) return `▌ ${embedText}`;
    const sticker = (msg as any).stickerItems?.[0]?.name;
    if (sticker) return `🏷️ стикер «${sticker}»`;
    return "(без текста)";
}

async function toggle(msg: Message) {
    await ready;
    if (isBookmarked(msg.id)) {
        await change(list => list.filter(b => b.id !== msg.id));
        toast("Убрано из закладок");
        return;
    }

    const channel = ChannelStore.getChannel(msg.channel_id);
    const guildId = channel?.guild_id ?? null;
    const bookmark: Bookmark = {
        id: msg.id,
        channelId: msg.channel_id,
        guildId,
        author: (msg.author as any).globalName ?? msg.author.username,
        avatar: msg.author.getAvatarURL?.(undefined, 64) ?? "",
        content: describe(msg, guildId),
        timestamp: new Date(msg.timestamp as any).getTime(),
        savedAt: Date.now(),
        channelName: channelLabel(msg.channel_id),
        guildName: guildId ? GuildStore.getGuild(guildId)?.name : undefined
    };
    await change(list => [bookmark, ...list.filter(b => b.id !== msg.id)]);
    toast("Добавлено в закладки");
}

function jumpTo(b: Bookmark) {
    if (!ChannelStore.getChannel(b.channelId)) {
        toast("Этот канал больше недоступен: вы вышли с сервера или канал удалён", Toasts.Type.FAILURE);
        return false;
    }
    NavigationRouter.transitionTo(`/channels/${b.guildId ?? "@me"}/${b.channelId}/${b.id}`);
    return true;
}

function whereLabel(b: Bookmark) {
    const channel = channelLabel(b.channelId) ?? b.channelName ?? "канал недоступен";
    const guild = b.guildId ? GuildStore.getGuild(b.guildId)?.name ?? b.guildName : null;
    return guild ? `${guild} · ${channel}` : channel;
}

function useBookmarks() {
    const [list, setList] = useState(cache);
    useEffect(() => {
        const update = () => setList(cache);
        listeners.add(update);
        ready.then(update);
        return () => void listeners.delete(update);
    }, []);
    return list;
}

function BookmarksList({ onClose }: { onClose(): void; }) {
    const list = useBookmarks();
    const [query, setQuery] = useState("");

    const q = query.trim().toLowerCase();
    const shown = q
        ? list.filter(b => [b.content, b.author, whereLabel(b)].some(s => s.toLowerCase().includes(q)))
        : list;

    return (
        <div className="nc-bookmarks">
            <TextInput value={query} onChange={setQuery} placeholder="Поиск по тексту, автору или каналу" autoFocus />
            {shown.length === 0 && (
                <div className="nc-bookmarks-empty">
                    {list.length === 0
                        ? "Закладок пока нет. Наведите на сообщение и нажмите значок закладки, или ПКМ → «Добавить в закладки»."
                        : "Ничего не найдено."}
                </div>
            )}
            {shown.map(b => (
                <div
                    key={b.id}
                    className="nc-bookmark"
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (jumpTo(b)) onClose(); }}
                    onKeyDown={e => { if (e.key === "Enter" && jumpTo(b)) onClose(); }}
                >
                    {b.avatar && <img className="nc-bookmark-avatar" src={b.avatar} alt="" />}
                    <div className="nc-bookmark-body">
                        <div className="nc-bookmark-meta">
                            <b>{b.author}</b> · {whereLabel(b)} · {new Date(b.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                        <div className="nc-bookmark-content">{b.content}</div>
                    </div>
                    <div className="nc-bookmark-actions">
                        <button
                            className="nc-bookmark-action"
                            aria-label="Скопировать текст"
                            title="Скопировать текст"
                            onClick={e => { e.stopPropagation(); copyWithToast(b.content, "Текст скопирован"); }}
                        >
                            ⧉
                        </button>
                        <button
                            className="nc-bookmark-action nc-bookmark-remove"
                            aria-label="Удалить закладку"
                            title="Удалить закладку"
                            onClick={e => { e.stopPropagation(); change(l => l.filter(x => x.id !== b.id)); }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function BookmarksTitle() {
    const list = useBookmarks();
    return <>Закладки{list.length ? ` · ${list.length}` : ""}</>;
}

export function openBookmarks() {
    openModal(props => (
        <ErrorBoundary>
            <Modal {...props} title={<BookmarksTitle />} size="lg">
                <BookmarksList onClose={props.onClose} />
            </Modal>
        </ErrorBoundary>
    ));
}

const BookmarkIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <path fill="currentColor" d="M6 3h12a1 1 0 0 1 1 1v17.2a.8.8 0 0 1-1.24.66L12 18l-5.76 3.86A.8.8 0 0 1 5 21.2V4a1 1 0 0 1 1-1Zm1 2v14.3l5-3.35 5 3.35V5H7Z" />
    </svg>
);

const BookmarkFilledIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <path fill="currentColor" d="M6 3h12a1 1 0 0 1 1 1v17.2a.8.8 0 0 1-1.24.66L12 18l-5.76 3.86A.8.8 0 0 1 5 21.2V4a1 1 0 0 1 1-1Z" />
    </svg>
);

const messageContextMenu: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message) return;
    children.push(
        <Menu.MenuItem
            id="nc-bookmark-toggle"
            label={isBookmarked(message.id) ? "Убрать из закладок" : "Добавить в закладки"}
            action={() => toggle(message)}
        />
    );
};

export default definePlugin({
    name: "Bookmarks",
    description: "Save messages to a private bookmark list (bookmark button on hover or right-click). Open it with /bookmarks or from the Nightcord toolbox.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Nightcord],
    dependencies: ["MessagePopoverAPI"],
    enabledByDefault: true,

    contextMenus: {
        "message": messageContextMenu
    },

    messagePopoverButton: {
        icon: BookmarkIcon,
        render(message: Message) {
            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel) return null;
            const saved = isBookmarked(message.id);
            return {
                label: saved ? "Убрать из закладок" : "В закладки",
                icon: saved ? BookmarkFilledIcon : BookmarkIcon,
                message,
                channel,
                onClick: () => toggle(message)
            };
        }
    },

    toolboxActions: {
        "Закладки": openBookmarks
    },

    commands: [{
        name: "bookmarks",
        description: "Открыть закладки",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => { openBookmarks(); }
    }],

    start() {
        load();
    }
});
