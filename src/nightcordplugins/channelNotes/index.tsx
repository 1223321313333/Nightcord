/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { currentNotice, noticesQueue, popNotice, showNotice } from "@api/Notices";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Channel, Guild, ModalAction, RenderModalProps } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { ChannelStore, GuildStore, Menu, Modal, openModal, React, SelectedChannelStore, TextArea, useState } from "@webpack/common";

import style from "./style.css?managed";

const KEY = "Nightcord_ChannelNotes";

/** Keyed by channel id or guild id */
let notes: Record<string, string> = {};

const settings = definePluginSettings({
    showBanner: {
        type: OptionType.BOOLEAN,
        description: "Show the note in a banner at the top when you open a channel or server that has one",
        default: true
    }
});

async function setNote(id: string, text: string) {
    const trimmed = text.trim();
    if (trimmed) notes[id] = trimmed;
    else delete notes[id];
    await DataStore.set(KEY, notes);
}

function getNotesFor(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    const guildId = channel?.guild_id;
    // A thread without its own note shows the note of the channel it belongs to
    const parentId = channel?.isThread?.() ? channel.parent_id : undefined;
    return {
        channel: notes[channelId] ?? (parentId ? notes[parentId] : undefined),
        guild: guildId ? notes[guildId] : undefined,
        guildName: guildId ? GuildStore.getGuild(guildId)?.name : undefined
    };
}

let lastNotice: string | null = null;

function dismissOwnNotice() {
    if (!lastNotice) return;
    // Drop our queued notices and the one on screen, but never other plugins' notices
    for (let i = noticesQueue.length - 1; i >= 0; i--) {
        if (noticesQueue[i][1] === lastNotice) noticesQueue.splice(i, 1);
    }
    if (currentNotice?.[1] === lastNotice) popNotice();
    lastNotice = null;
}

function showBannerFor(channelId: string | null | undefined) {
    dismissOwnNotice();
    if (!channelId || !settings.store.showBanner) return;

    const n = getNotesFor(channelId);
    const parts = [
        n.guild && `📌 ${n.guildName ?? "Сервер"}: ${n.guild}`,
        n.channel && `📝 ${n.channel}`
    ].filter(Boolean);
    if (!parts.length) return;

    lastNotice = parts.join("   ·   ");
    showNotice(lastNotice, "Изменить", () => {
        lastNotice = null;
        openNoteEditor(channelId, "канала");
    });
}

function NoteEditor({ id, what, modalProps }: { id: string; what: string; modalProps: RenderModalProps; }) {
    const existing = notes[id];
    const [text, setText] = useState(existing ?? "");

    async function commit(value: string) {
        await setNote(id, value);
        modalProps.onClose();
        showBannerFor(SelectedChannelStore.getChannelId());
    }

    const actions: ModalAction[] = [{ text: "Сохранить", variant: "primary", onClick: () => commit(text) }];
    if (existing) actions.push({ text: "Удалить", variant: "critical-primary", onClick: () => commit("") });

    return (
        <Modal
            {...modalProps}
            title={`Заметка ${what}`}
            subtitle="Видна только вам · Ctrl+Enter — сохранить"
            size="md"
            actions={actions}
        >
            <div onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(text); } }}>
                <TextArea value={text} onChange={setText} placeholder="Например: тут скидывают читы, не путать с основным" autosize autoFocus />
            </div>
        </Modal>
    );
}

function openNoteEditor(id: string, what: string) {
    openModal(props => (
        <ErrorBoundary>
            <NoteEditor id={id} what={what} modalProps={props} />
        </ErrorBoundary>
    ));
}

const channelMenu: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel) return;
    children.push(
        <Menu.MenuItem
            id="nc-channel-note"
            label={notes[channel.id] ? "Изменить заметку" : "Добавить заметку"}
            action={() => openNoteEditor(channel.id, "канала")}
        />
    );
};

const guildMenu: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    if (!guild) return;
    children.push(
        <Menu.MenuItem
            id="nc-guild-note"
            label={notes[guild.id] ? "Изменить заметку сервера" : "Добавить заметку сервера"}
            action={() => openNoteEditor(guild.id, "сервера")}
        />
    );
};

const NoteIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <path fill="currentColor" d="M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5L14 4.5ZM8 11v1.5h8V11H8Zm0 3.5V16h8v-1.5H8Zm0 3.5v1.5h5V18H8Z" />
    </svg>
);

const NoteButton: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    if (!isMainChat || !channel) return null;
    const note = notes[channel.id];
    return (
        <ChatBarButton
            tooltip={note ? `Заметка: ${note}` : "Добавить заметку к каналу"}
            onClick={() => openNoteEditor(channel.id, "канала")}
        >
            <NoteIcon className={note ? undefined : "nc-note-empty"} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "ChannelNotes",
    description: "Private notes for any channel or server, shown in a banner when you open it",
    tags: ["Utility", "Organisation"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,

    managedStyle: style,

    contextMenus: {
        "channel-context": channelMenu,
        "thread-context": channelMenu,
        "gdm-context": channelMenu,
        "guild-context": guildMenu
    },

    chatBarButton: {
        icon: NoteIcon,
        render: NoteButton
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId: string | null; }) {
            showBannerFor(channelId);
        }
    },

    async start() {
        notes = await DataStore.get(KEY) ?? {};
        showBannerFor(SelectedChannelStore.getChannelId());
    },

    stop() {
        dismissOwnNotice();
    }
});
