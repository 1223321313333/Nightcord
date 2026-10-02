/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderModalProps } from "@nightcord/discord-types";
import { Alerts, ChannelStore, GuildStore, Modal, openModal, React, UserStore } from "@webpack/common";

import { summarize, WrappedSummary } from "./summary";
import { snapshot } from "./tracker";

const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

function channelLabel(id: string): string {
    const ch = ChannelStore.getChannel(id) as any;
    if (!ch) return "удалённый канал";
    if (ch.isDM?.()) {
        const uid = ch.getRecipientId?.() ?? ch.recipients?.[0];
        const u = uid && (UserStore.getUser(uid) as any);
        return "ЛС: " + (u?.globalName || u?.username || "кто-то");
    }
    if (ch.isGroupDM?.()) return ch.name || "групповой чат";
    const g = ch.guild_id && GuildStore.getGuild(ch.guild_id);
    return (g ? g.name + " · " : "") + "#" + (ch.name || "канал");
}

const nf = (n: number) => Math.round(n).toLocaleString("ru-RU");

const card: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 2, padding: "12px 14px", borderRadius: 12,
    background: "var(--background-surface-high, var(--background-secondary))",
    border: "1px solid var(--border-subtle, transparent)"
};
const big: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: "var(--text-strong, var(--header-primary))", lineHeight: 1.1 };
const label: React.CSSProperties = { fontSize: 12, opacity: 0.7 };

function Stat({ value, title }: { value: React.ReactNode; title: string; }) {
    return <div style={card}><div style={big}>{value}</div><div style={label}>{title}</div></div>;
}

function HoursChart({ hours }: { hours: number[]; }) {
    const max = Math.max(...hours, 1);
    return (
        <div style={{ ...card, gap: 8 }}>
            <div style={label}>Когда вы пишете (по часам, 0–23)</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 56 }}>
                {hours.map((v, i) => (
                    <div
                        key={i}
                        title={`${i}:00 — ${v}`}
                        style={{
                            flex: 1, height: `${Math.max(3, (v / max) * 100)}%`, borderRadius: 2,
                            background: "var(--brand-500, #c4a3ff)", opacity: v ? 1 : 0.25
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function Body({ s }: { s: WrappedSummary; }) {
    const since = new Date(s.firstAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 13 }}>С {since} по сегодня · {nf(s.spanDays)} дн.</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                <Stat value={nf(s.total)} title="сообщений отправлено" />
                <Stat value={nf(s.activeDays)} title="дней вы были активны" />
                <Stat value={s.perActiveDay.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} title="в среднем за активный день" />
                <Stat value={`${nf(s.bestStreak)} 🔥`} title="лучшая серия дней подряд" />
                <Stat value={nf(s.chars)} title="символов напечатано" />
                <Stat value={`~${nf(s.avgLength)}`} title="символов в сообщении" />
                <Stat value={nf(s.reactionsGiven)} title="реакций поставлено" />
                <Stat value={`${nf(s.links)} / ${nf(s.images)} / ${nf(s.files)}`} title="ссылок / картинок / файлов" />
                <Stat value={`${s.peakHour}:00`} title="любимый час" />
                <Stat value={WEEKDAYS[s.peakWeekday]} title="самый активный день" />
            </div>

            <HoursChart hours={s.hours} />

            {s.topChannels.length > 0 && (
                <div style={{ ...card, gap: 6 }}>
                    <div style={label}>Где вы пишете больше всего</div>
                    {s.topChannels.map((c, i) => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {channelLabel(c.id)}</span>
                            <span style={{ opacity: 0.7, whiteSpace: "nowrap" }}>{nf(c.count)} · {c.share}%</span>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ fontSize: 12, opacity: 0.6 }}>
                Считается только ваша активность, только на этом компьютере, с момента установки. Можно сделать скриншот и похвастаться 🌙
            </div>
        </div>
    );
}

function WrappedModal(props: RenderModalProps & { onReset: () => void; }) {
    const s = summarize(snapshot());
    const empty = s.total === 0;
    return (
        <Modal
            {...props}
            size="md"
            title="🌙 Год в Nightcord"
            subtitle="Ваша активность в цифрах"
            actions={[
                { text: "Готово", variant: "primary", onClick: props.onClose },
                { text: "Сбросить", variant: "secondary", onClick: props.onReset }
            ]}
        >
            {empty
                ? <div style={{ opacity: 0.8 }}>Пока нечего показать — напишите пару сообщений, и статистика появится здесь.</div>
                : <Body s={s} />}
        </Modal>
    );
}

export function openWrapped(reset: () => Promise<void>) {
    openModal((props: RenderModalProps) => (
        <WrappedModal
            {...props}
            onReset={() => Alerts.show({
                title: "Сбросить статистику?",
                body: "Все накопленные цифры «Год в Nightcord» будут удалены без возможности восстановления.",
                confirmText: "Сбросить",
                confirmColor: "danger",
                cancelText: "Отмена",
                onConfirm: () => void reset()
            })}
        />
    ));
}
