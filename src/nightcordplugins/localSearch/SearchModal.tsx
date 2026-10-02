/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderModalProps } from "@nightcord/discord-types";
import { Alerts, ChannelStore, GuildStore, Modal, NavigationRouter, openModal, React, TextInput, UserStore } from "@webpack/common";

import { IndexedMsg, searchMessages } from "./search";
import { all, clearAll, size } from "./store";

function channelLabel(id: string, guildId?: string): string {
    const ch = ChannelStore.getChannel(id) as any;
    if (!ch) return "удалённый канал";
    if (ch.isDM?.()) {
        const uid = ch.getRecipientId?.() ?? ch.recipients?.[0];
        const u = uid && (UserStore.getUser(uid) as any);
        return "ЛС: " + (u?.globalName || u?.username || "кто-то");
    }
    if (ch.isGroupDM?.()) return ch.name || "групповой чат";
    const g = guildId && GuildStore.getGuild(guildId);
    return (g ? g.name + " · " : "") + "#" + (ch.name || "канал");
}

function Row({ r, onJump }: { r: IndexedMsg; onJump: () => void; }) {
    return (
        <div
            onClick={onJump}
            style={{
                padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                background: "var(--background-surface-high, var(--background-secondary))",
                border: "1px solid var(--border-subtle, transparent)"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, opacity: 0.7 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.authorName || "кто-то"} · {channelLabel(r.channelId, r.guildId)}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>{new Date(r.ts).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
            <div style={{ marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {r.content.length > 300 ? r.content.slice(0, 300) + "…" : r.content}
            </div>
        </div>
    );
}

function SearchModal(props: RenderModalProps) {
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<IndexedMsg[]>([]);

    React.useEffect(() => {
        const h = setTimeout(() => setResults(searchMessages(all(), query, 100)), 150);
        return () => clearTimeout(h);
    }, [query]);

    const jump = (r: IndexedMsg) => {
        props.onClose();
        NavigationRouter.transitionTo(`/channels/${r.guildId ?? "@me"}/${r.channelId}/${r.id}`);
    };

    const confirmClear = () => Alerts.show({
        title: "Очистить индекс поиска?",
        body: "Все сохранённые локально сообщения для поиска будут удалены. На сами сообщения в Discord это не влияет.",
        confirmText: "Очистить",
        confirmColor: "danger",
        cancelText: "Отмена",
        onConfirm: () => void clearAll().then(() => setResults([]))
    });

    return (
        <Modal
            {...props}
            size="lg"
            title="🔎 Поиск по переписке"
            subtitle={`${size().toLocaleString("ru-RU")} сообщений в локальном индексе`}
            actions={[
                { text: "Закрыть", variant: "primary", onClick: props.onClose },
                { text: "Очистить индекс", variant: "secondary", onClick: confirmClear }
            ]}
        >
            <TextInput
                value={query}
                onChange={setQuery}
                placeholder="Слова для поиска… (можно from:имя)"
                autoFocus
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, maxHeight: 460, overflowY: "auto" }}>
                {query.trim() === ""
                    ? <div style={{ opacity: 0.7 }}>Начните печатать. Ищется по сообщениям, которые вы уже видели — мгновенно и без интернета.</div>
                    : results.length === 0
                        ? <div style={{ opacity: 0.7 }}>Ничего не найдено.</div>
                        : results.map(r => <Row key={r.id} r={r} onJump={() => jump(r)} />)}
            </div>
        </Modal>
    );
}

export function openSearch() {
    openModal(props => <SearchModal {...props} />);
}
