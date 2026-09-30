/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Counts what the Discord page loads from servers that are not Discord's, for the privacy section in
 * Nightcord settings. Uses the browser's own resource timing, so nothing is patched or slowed down.
 * Requests made by the desktop app's main process (like the update check) are not part of it.
 */

const DISCORD_HOST = /(^|\.)(discord\.com|discordapp\.com|discordapp\.net|discord\.gg|discord\.media|discordcdn\.com|discordstatus\.com)$/;
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/;

export interface OutsideHost {
    host: string;
    count: number;
    /** ms since the page started */
    firstAt: number;
    /** initiator types, like img, fetch, css, iframe */
    kinds: Set<string>;
}

const hosts = new Map<string, OutsideHost>();
const listeners = new Set<() => void>();
let notifyQueued = false;

function record(entries: PerformanceEntryList) {
    let changed = false;
    for (const entry of entries as PerformanceResourceTiming[]) {
        let url: URL;
        try {
            url = new URL(entry.name);
        } catch {
            continue;
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") continue;
        const { hostname } = url;
        if (DISCORD_HOST.test(hostname) || LOCAL_HOST.test(hostname) || hostname === location.hostname) continue;

        let stat = hosts.get(hostname);
        if (!stat) hosts.set(hostname, stat = { host: hostname, count: 0, firstAt: entry.startTime, kinds: new Set() });
        stat.count++;
        stat.kinds.add(entry.initiatorType || "other");
        changed = true;
    }

    if (changed && !notifyQueued) {
        notifyQueued = true;
        queueMicrotask(() => {
            notifyQueued = false;
            listeners.forEach(l => l());
        });
    }
}

try {
    // buffered: also gets what loaded before Nightcord started watching
    new PerformanceObserver(list => record(list.getEntries())).observe({ type: "resource", buffered: true });
} catch {
    // no resource timing: the log simply stays empty
}

export function getOutsideHosts(): OutsideHost[] {
    return [...hosts.values()].sort((a, b) => a.firstAt - b.firstAt);
}

export function subscribeOutsideHosts(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
}
