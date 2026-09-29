/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Channel, Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { IconComponent } from "@utils/types";
import { Alerts, Constants, ContextMenuApi, Menu, React, RestAPI, SnowflakeUtils, Toasts, UserStore } from "@webpack/common";

import { fetchHistory, MAX_HISTORY } from "../_shared/messages";

const logger = new Logger("DisappearingMessages");

const TIMERS_KEY = "Nightcord_DisappearingTimers";
const QUEUE_KEY = "Nightcord_DisappearingQueue";

const HOUR = 3_600_000;
const OPTIONS: { label: string; ms: number; }[] = [
    { label: "1 час", ms: HOUR },
    { label: "1 день", ms: 24 * HOUR },
    { label: "7 дней", ms: 7 * 24 * HOUR }
];
// One delete at a time with a pause, like a person deleting by hand; Discord rate-limits faster deletion
const DELETE_GAP = 1_200;
// Types a user can delete: default, reply, slash command, context menu command
const DELETABLE = new Set([0, 19, 20, 23]);

/** channel id -> lifetime of your messages in ms */
let timers: Record<string, number> = {};
/** messages waiting to be deleted, oldest first */
let queue: { channelId: string; messageId: string; deleteAt: number; }[] = [];
let ready: Promise<void> = Promise.resolve();
let tick: ReturnType<typeof setInterval> | undefined;
let working = false;
let bulk: { channelId: string; cancelled: boolean; } | null = null;
const listeners = new Set<() => void>();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const toast = (message: string, type = Toasts.Type.MESSAGE) => Toasts.show({ message, type, id: Toasts.genId() });

function label(ms: number) {
    return OPTIONS.find(o => o.ms === ms)?.label ?? `${Math.round(ms / HOUR)} ч`;
}

async function saveTimers() {
    await DataStore.set(TIMERS_KEY, timers);
    listeners.forEach(l => l());
}

const saveQueue = () => DataStore.set(QUEUE_KEY, queue);

async function setTimer(channelId: string, ms: number | null) {
    await ready;
    if (ms) timers[channelId] = ms;
    else delete timers[channelId];
    await saveTimers();
    toast(ms
        ? `⏳ Ваши новые сообщения здесь будут удаляться через ${label(ms)}`
        : "Исчезающие сообщения в этом чате выключены");
}

/** Deletes one message. true when it is gone (or was already), false to try again later. */
async function deleteMessage(channelId: string, messageId: string) {
    try {
        await RestAPI.del({ url: Constants.Endpoints.MESSAGE(channelId, messageId), retries: 2 });
        return true;
    } catch (err: any) {
        // already deleted, channel gone or no access: nothing left to do
        if ([403, 404].includes(err?.status)) return true;
        logger.warn(`Could not delete ${messageId}`, err);
        return false;
    }
}

async function processQueue() {
    if (working) return;
    working = true;
    try {
        await ready;
        const now = Date.now();
        let changed = false;
        while (queue.length && queue[0].deleteAt <= now) {
            const item = queue[0];
            if (!await deleteMessage(item.channelId, item.messageId)) break;
            queue.shift();
            changed = true;
            await sleep(DELETE_GAP);
        }
        if (changed) await saveQueue();
    } finally {
        working = false;
    }
}

async function enqueue(message: Message) {
    const ttl = timers[message.channel_id];
    if (!ttl) return;
    const sentAt = SnowflakeUtils.extractTimestamp(message.id);
    queue.push({ channelId: message.channel_id, messageId: message.id, deleteAt: sentAt + ttl });
    queue.sort((a, b) => a.deleteAt - b.deleteAt);
    await saveQueue();
}

/** Deletes your messages among the last `scan` messages of a channel, slowly */
async function deleteMine(channel: Channel, scan: number) {
    if (bulk) {
        toast("Удаление уже идёт в другом чате", Toasts.Type.FAILURE);
        return;
    }
    const me = UserStore.getCurrentUser().id;
    bulk = { channelId: channel.id, cancelled: false };
    listeners.forEach(l => l());
    toast("🧹 Ищу ваши сообщения…");

    let deleted = 0;
    try {
        const history = await fetchHistory(channel.id, scan);
        const mine = history.filter(m => m.author.id === me && DELETABLE.has(m.type)).reverse();
        toast(`🧹 Найдено ваших сообщений: ${mine.length}. Удаляю по одному…`);
        for (const m of mine) {
            if (bulk.cancelled) break;
            if (await deleteMessage(channel.id, m.id)) deleted++;
            if (deleted && deleted % 25 === 0) toast(`🧹 Удалено ${deleted} из ${mine.length}`);
            await sleep(DELETE_GAP);
        }
        toast(bulk.cancelled ? `Остановлено. Удалено: ${deleted}` : `✅ Готово, удалено сообщений: ${deleted}`, Toasts.Type.SUCCESS);
    } catch (err) {
        logger.error("Bulk delete failed", err);
        toast(`Не удалось закончить удаление (удалено ${deleted})`, Toasts.Type.FAILURE);
    } finally {
        bulk = null;
        listeners.forEach(l => l());
    }
}

function confirmDeleteMine(channel: Channel) {
    Alerts.show({
        title: "Удалить ваши сообщения в этом чате?",
        body: "Nightcord просмотрит последние 1000 сообщений чата и удалит все ваши, по одному в секунду. Это нельзя отменить, удалённое не восстановить. Большой чат займёт до 20 минут, Discord при этом можно пользоваться.",
        confirmText: "Удалить",
        confirmColor: "danger",
        cancelText: "Отмена",
        onConfirm: () => void deleteMine(channel, Math.min(1000, MAX_HISTORY))
    });
}

function TimerMenuItems({ channel }: { channel: Channel; }) {
    const current = timers[channel.id];
    return (
        <>
            {OPTIONS.map(o => (
                <Menu.MenuRadioItem
                    key={o.ms}
                    id={`nc-disappearing-${o.ms}`}
                    group="nc-disappearing"
                    label={`Удалять через ${o.label}`}
                    checked={current === o.ms}
                    action={() => setTimer(channel.id, o.ms)}
                />
            ))}
            <Menu.MenuRadioItem
                id="nc-disappearing-off"
                group="nc-disappearing"
                label="Не удалять"
                checked={!current}
                action={() => setTimer(channel.id, null)}
            />
            <Menu.MenuSeparator />
            {bulk?.channelId === channel.id
                ? <Menu.MenuItem id="nc-disappearing-stop" label="Остановить удаление" action={() => { if (bulk) bulk.cancelled = true; }} />
                : <Menu.MenuItem id="nc-disappearing-bulk" label="Удалить мои сообщения здесь…" color="danger" action={() => confirmDeleteMine(channel)} />}
        </>
    );
}

const channelMenu: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel) return;
    children.push(
        <Menu.MenuItem id="nc-disappearing" label={timers[channel.id] ? `Исчезающие сообщения: ${label(timers[channel.id])}` : "Исчезающие сообщения"}>
            {TimerMenuItems({ channel })}
        </Menu.MenuItem>
    );
};

const HourglassIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <path fill="currentColor" d="M6 2h12v2h-1v3.2a5 5 0 0 1-2.2 4.15L13.5 12l1.3.65A5 5 0 0 1 17 16.8V20h1v2H6v-2h1v-3.2a5 5 0 0 1 2.2-4.15L10.5 12l-1.3-.65A5 5 0 0 1 7 7.2V4H6V2Zm3 2v3.2c0 1 .5 1.9 1.3 2.45L12 10.8l1.7-1.15A3 3 0 0 0 15 7.2V4H9Z" />
    </svg>
);

function useTimer(channelId: string) {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => {
        listeners.add(force);
        return () => void listeners.delete(force);
    }, []);
    return timers[channelId];
}

const TimerButton: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    const ttl = useTimer(channel?.id ?? "");
    if (!isMainChat || !channel || !ttl) return null;
    return (
        <ChatBarButton
            tooltip={`Исчезающие сообщения: удаляются через ${label(ttl)}`}
            onClick={e => ContextMenuApi.openContextMenu(e, () => (
                <Menu.Menu navId="nc-disappearing-menu" onClose={ContextMenuApi.closeContextMenu}>
                    {TimerMenuItems({ channel })}
                </Menu.Menu>
            ))}
        >
            <HourglassIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "DisappearingMessages",
    description: "Deletes your messages in chosen chats after 1 hour, 1 day or 7 days, and can delete your messages in a chat. Set it from a chat's right-click menu.",
    tags: ["Privacy", "Chat"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,

    contextMenus: {
        "channel-context": channelMenu,
        "thread-context": channelMenu,
        "gdm-context": channelMenu,
        "user-context": (children, { channel }: { channel?: Channel; }) => {
            // a DM's own context menu comes as user-context with the DM channel
            if (channel?.isDM?.()) channelMenu(children, { channel });
        }
    },

    chatBarButton: {
        icon: HourglassIcon,
        render: TimerButton
    },

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic || !message?.id || message.author?.id !== UserStore.getCurrentUser()?.id) return;
            if (!DELETABLE.has(message.type)) return;
            void enqueue(message);
        }
    },

    start() {
        ready = Promise.all([DataStore.get(TIMERS_KEY), DataStore.get(QUEUE_KEY)]).then(([t, q]) => {
            timers = t ?? {};
            queue = q ?? [];
            listeners.forEach(l => l());
        });
        tick = setInterval(processQueue, 30_000);
        void processQueue();
    },

    stop() {
        clearInterval(tick);
        if (bulk) bulk.cancelled = true;
    }
});
