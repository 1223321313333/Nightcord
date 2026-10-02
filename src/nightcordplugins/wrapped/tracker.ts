/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Keeps running counters about YOUR OWN messages for the "Год в Nightcord" recap. Everything stays in this
// computer's local storage; nothing is sent anywhere. Only your own activity is counted.

import * as DataStore from "@api/DataStore";

import { emptyRaw, streakStep, WrappedRaw } from "./summary";

const KEY = "Nightcord_Wrapped";
const DAY = 86_400_000;
const SAVE_DELAY = 5_000;

interface Stored extends WrappedRaw {
    lastDayNum: number | null;
    curStreak: number;
}

let data: Stored = { ...emptyRaw(), lastDayNum: null, curStreak: 0 };
let loaded = false;
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export async function load() {
    if (loaded) return;
    try {
        const stored = await DataStore.get<Stored>(KEY);
        if (stored) data = { ...data, ...stored };
    } catch {
        // start fresh if storage is unavailable
    }
    loaded = true;
}

export function snapshot(): WrappedRaw {
    return data;
}

export async function reset() {
    data = { ...emptyRaw(), lastDayNum: null, curStreak: 0 };
    await DataStore.set(KEY, data);
}

export async function flush() {
    if (!dirty) return;
    dirty = false;
    try {
        await DataStore.set(KEY, data);
    } catch {
        dirty = true;
    }
}

function scheduleSave() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flush(), SAVE_DELAY);
}

function markDay(ts: number) {
    const dayNum = Math.floor(new Date(ts).setHours(0, 0, 0, 0) / DAY);
    const { streak, isNewDay } = streakStep(data.lastDayNum, data.curStreak, dayNum);
    if (!isNewDay) return;
    data.lastDayNum = dayNum;
    data.curStreak = streak;
    data.activeDays++;
    if (streak > data.bestStreak) data.bestStreak = streak;
}

export function recordMessage(msg: { ts: number; channelId: string; content: string; attachments: number; isImage: boolean; }) {
    if (!loaded) return;
    const d = new Date(msg.ts);
    data.total++;
    data.hours[d.getHours()]++;
    data.weekdays[d.getDay()]++;
    data.channels[msg.channelId] = (data.channels[msg.channelId] ?? 0) + 1;
    if (msg.content) data.chars += msg.content.length;
    data.links += msg.content.match(/https?:\/\/\S+/g)?.length ?? 0;
    if (msg.isImage) data.images++;
    data.files += msg.attachments;
    markDay(msg.ts);
    scheduleSave();
}

export function recordReaction() {
    if (!loaded) return;
    data.reactionsGiven++;
    scheduleSave();
}
