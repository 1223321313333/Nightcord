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
import definePlugin from "@utils/types";
import { ChannelStore, Menu, Modal, NavigationRouter, openModal, React, TextInput, Toasts, useEffect, useState } from "@webpack/common";

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
}

let cache: Bookmark[] = [];

async function load() {
    cache = await DataStore.get<Bookmark[]>(KEY) ?? [];
}

async function save(list: Bookmark[]) {
    cache = list;
    await DataStore.set(KEY, list);
}

const isBookmarked = (id: string) => cache.some(b => b.id === id);

function toast(message: string) {
    Toasts.show({ message, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
}

async function toggle(msg: Message) {
    if (isBookmarked(msg.id)) {
        await save(cache.filter(b => b.id !== msg.id));
        toast("Убрано из закладок");
        return;
    }

    const channel = ChannelStore.getChannel(msg.channel_id);
    const attachments = msg.attachments?.map(a => a.filename).join(", ");

    await save([{
        id: msg.id,
        channelId: msg.channel_id,
        guildId: channel?.guild_id ?? null,
        author: (msg.author as any).globalName ?? msg.author.username,
        avatar: msg.author.getAvatarURL?.(undefined, 64) ?? "",
        content: msg.content || (attachments ? `📎 ${attachments}` : "(без текста)"),
        timestamp: new Date(msg.timestamp as any).getTime(),
        savedAt: Date.now()
    }, ...cache]);
    toast("Добавлено в закладки");
}

function jumpTo(b: Bookmark) {
    NavigationRouter.transitionTo(`/channels/${b.guildId ?? "@me"}/${b.channelId}/${b.id}`);
}

function channelName(b: Bookmark) {
    const channel = ChannelStore.getChannel(b.channelId);
    if (!channel) return "неизвестный канал";
    return channel.name ? `#${channel.name}` : "ЛС";
}

function BookmarksList({ onClose }: { onClose(): void; }) {
    const [list, setList] = useState(cache);
    const [query, setQuery] = useState("");

    useEffect(() => { load().then(() => setList(cache)); }, []);

    const q = query.toLowerCase();
    const shown = list.filter(b => !q || b.content.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));

    async function remove(id: string) {
        await save(cache.filter(b => b.id !== id));
        setList(cache);
    }

    return (
        <div className="nc-bookmarks">
            <TextInput value={query} onChange={setQuery} placeholder="Поиск по тексту или автору" autoFocus />
            {shown.length === 0 && (
                <div className="nc-bookmarks-empty">
                    {list.length === 0 ? "Закладок пока нет. ПКМ по сообщению → «Добавить в закладки»." : "Ничего не найдено."}
                </div>
            )}
            {shown.map(b => (
                <div key={b.id} className="nc-bookmark" onClick={() => { jumpTo(b); onClose(); }}>
                    {b.avatar && <img className="nc-bookmark-avatar" src={b.avatar} alt="" />}
                    <div className="nc-bookmark-body">
                        <div className="nc-bookmark-meta">
                            <b>{b.author}</b> · {channelName(b)} · {new Date(b.timestamp).toLocaleString("ru-RU")}
                        </div>
                        <div className="nc-bookmark-content">{b.content}</div>
                    </div>
                    <button
                        className="nc-bookmark-remove"
                        aria-label="Удалить закладку"
                        onClick={e => { e.stopPropagation(); remove(b.id); }}
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}

export function openBookmarks() {
    openModal(props => (
        <ErrorBoundary>
            <Modal {...props} title="Закладки" size="lg">
                <BookmarksList onClose={props.onClose} />
            </Modal>
        </ErrorBoundary>
    ));
}

const messageContextMenu: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message) return;
    const saved = isBookmarked(message.id);
    children.push(
        <Menu.MenuItem
            id="nc-bookmark-toggle"
            label={saved ? "Убрать из закладок" : "Добавить в закладки"}
            action={() => toggle(message)}
        />
    );
};

export default definePlugin({
    name: "Bookmarks",
    description: "Save messages to a private bookmark list (right-click a message). Open it with /bookmarks or from the Nightcord toolbox.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    contextMenus: {
        "message": messageContextMenu
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
