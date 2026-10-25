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

/** A fresh tracker state. Pure, shared with the tests. */
export function emptyStored(): Stored {
    return { ...emptyRaw(), lastDayNum: null, curStreak: 0 };
}

let data: Stored = emptyStored();
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
    data = emptyStored();
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

export interface WrappedMessage {
    ts: number;
    channelId: string;
    content: string;
    attachments: number;
    isImage: boolean;
}

/** Fold one of your messages into the running counters, including the daily streak. Pure, so it can be tested. */
export function applyMessage(data: Stored, msg: WrappedMessage) {
    const d = new Date(msg.ts);
    data.total++;
    data.hours[d.getHours()]++;
    data.weekdays[d.getDay()]++;
    data.channels[msg.channelId] = (data.channels[msg.channelId] ?? 0) + 1;
    if (msg.content) data.chars += msg.content.length;
    data.links += msg.content.match(/https?:\/\/\S+/g)?.length ?? 0;
    if (msg.isImage) data.images++;
    data.files += msg.attachments;

    const dayNum = Math.floor(new Date(msg.ts).setHours(0, 0, 0, 0) / DAY);
    const { streak, isNewDay } = streakStep(data.lastDayNum, data.curStreak, dayNum);
    if (isNewDay) {
        data.lastDayNum = dayNum;
        data.curStreak = streak;
        data.activeDays++;
        if (streak > data.bestStreak) data.bestStreak = streak;
    }
}

/** Count one reaction you gave. Pure, so it can be tested. */
export function applyReaction(data: Stored) {
    data.reactionsGiven++;
}

export function recordMessage(msg: WrappedMessage) {
    if (!loaded) return;
    applyMessage(data, msg);
    scheduleSave();
}

export function recordReaction() {
    if (!loaded) return;
    applyReaction(data);
    scheduleSave();
}
