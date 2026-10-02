/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Turns the counters the tracker keeps about YOUR OWN messages into the numbers the recap card shows.
// Pure, no imports, so the tests can run it. It only ever sees your own activity, kept locally.

export interface WrappedRaw {
    /** When tracking started */
    firstAt: number;
    total: number;
    /** 24 counts, one per hour of the day */
    hours: number[];
    /** 7 counts, Sunday first (JS getDay order) */
    weekdays: number[];
    /** channel id -> how many of your messages went there */
    channels: Record<string, number>;
    chars: number;
    links: number;
    images: number;
    files: number;
    reactionsGiven: number;
    /** distinct days you sent at least one message */
    activeDays: number;
    /** longest run of consecutive active days */
    bestStreak: number;
}

export interface ChannelShare {
    id: string;
    count: number;
    /** percentage of your messages, 0..100 */
    share: number;
}

export interface WrappedSummary {
    total: number;
    firstAt: number;
    spanDays: number;
    activeDays: number;
    perActiveDay: number;
    topChannels: ChannelShare[];
    peakHour: number;
    peakWeekday: number;
    hours: number[];
    chars: number;
    avgLength: number;
    links: number;
    images: number;
    files: number;
    reactionsGiven: number;
    bestStreak: number;
}

const DAY = 86_400_000;

export function emptyRaw(now = Date.now()): WrappedRaw {
    return {
        firstAt: now, total: 0, hours: new Array(24).fill(0), weekdays: new Array(7).fill(0),
        channels: {}, chars: 0, links: 0, images: 0, files: 0, reactionsGiven: 0, activeDays: 0, bestStreak: 0
    };
}

/** Advances the active-day streak. `newDayNum`/`prevDayNum` are whole local days (midnight ms / DAY). */
export function streakStep(prevDayNum: number | null, prevStreak: number, newDayNum: number) {
    if (prevDayNum === newDayNum) return { dayNum: newDayNum, streak: prevStreak, isNewDay: false };
    const streak = prevDayNum != null && newDayNum === prevDayNum + 1 ? prevStreak + 1 : 1;
    return { dayNum: newDayNum, streak, isNewDay: true };
}

function indexOfMax(values: number[]): number {
    let best = 0;
    for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
    return best;
}

export function summarize(raw: WrappedRaw, topN = 5, now = Date.now()): WrappedSummary {
    const total = Math.max(0, raw.total | 0);
    const topChannels: ChannelShare[] = Object.entries(raw.channels ?? {})
        .map(([id, count]) => ({ id, count, share: total ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);

    return {
        total,
        firstAt: raw.firstAt,
        spanDays: Math.max(0, (now - raw.firstAt) / DAY),
        activeDays: raw.activeDays | 0,
        perActiveDay: raw.activeDays ? total / raw.activeDays : 0,
        topChannels,
        peakHour: indexOfMax(raw.hours ?? new Array(24).fill(0)),
        peakWeekday: indexOfMax(raw.weekdays ?? new Array(7).fill(0)),
        hours: raw.hours ?? new Array(24).fill(0),
        chars: raw.chars | 0,
        avgLength: total ? Math.round((raw.chars || 0) / total) : 0,
        links: raw.links | 0,
        images: raw.images | 0,
        files: raw.files | 0,
        reactionsGiven: raw.reactionsGiven | 0,
        bestStreak: raw.bestStreak | 0
    };
}
