/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Holds the local message index in its own IndexedDB store and in memory for instant search. Everything stays
// on this computer. Old messages are dropped once the index grows past MAX, so storage stays bounded.

import * as DataStore from "@api/DataStore";

import { IndexedMsg } from "./search";

const DB = DataStore.createStore("NightcordSearch", "messages");
const MAX = 20_000;
const SAVE_DELAY = 8_000;

let records: IndexedMsg[] = [];
const ids = new Set<string>();
let pending: IndexedMsg[] = [];
let evicting: string[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let loaded = false;

export async function load() {
    if (loaded) return;
    try {
        records = await DataStore.values<IndexedMsg>(DB);
        for (const r of records) ids.add(r.id);
    } catch {
        records = [];
    }
    loaded = true;
}

export const all = () => records;
export const size = () => records.length;
export const isLoaded = () => loaded;

export function index(list: IndexedMsg[]) {
    if (!loaded) return;
    let added = false;
    for (const r of list) {
        if (!r.content || ids.has(r.id)) continue;
        ids.add(r.id);
        records.push(r);
        pending.push(r);
        added = true;
    }
    if (added) {
        clearTimeout(timer);
        timer = setTimeout(() => void flush(), SAVE_DELAY);
    }
}

export async function flush() {
    if (records.length > MAX) {
        records.sort((a, b) => a.ts - b.ts);
        const dead = records.splice(0, records.length - MAX);
        for (const d of dead) {
            ids.delete(d.id);
            evicting.push(d.id);
        }
    }
    const toWrite = pending;
    const toDelete = evicting;
    pending = [];
    evicting = [];
    try {
        if (toWrite.length) await DataStore.setMany(toWrite.map(r => [r.id, r] as [string, IndexedMsg]), DB);
        if (toDelete.length) await DataStore.delMany(toDelete, DB);
    } catch {
        // keep what failed for the next flush
        pending = toWrite.concat(pending);
        evicting = toDelete.concat(evicting);
    }
}

export async function clearAll() {
    records = [];
    ids.clear();
    pending = [];
    evicting = [];
    try {
        await DataStore.clear(DB);
    } catch {
        // nothing more to do
    }
}
