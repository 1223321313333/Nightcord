/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure host classification for the privacy "outside connections" counter (see networkLog.ts), with no DOM
// or performance-API dependencies, so it can be unit tested.

export const DISCORD_HOST = /(^|\.)(discord\.com|discordapp\.com|discordapp\.net|discord\.gg|discord\.media|discordcdn\.com|discordstatus\.com)$/;
export const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/;

/**
 * The host of a resource URL when it is an "outside" connection worth logging: an http(s) URL whose host
 * is not Discord's, not local, and not the page's own. Returns null otherwise.
 */
export function outsideHost(name: string, selfHost: string): string | null {
    let url: URL;
    try {
        url = new URL(name);
    } catch {
        return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const { hostname } = url;
    if (DISCORD_HOST.test(hostname) || LOCAL_HOST.test(hostname) || hostname === selfHost) return null;
    return hostname;
}
