/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Decides whether a message pings you directly: a @mention of you, or a reply to one of your messages.
// Pure, no imports, so the tests can run it. @everyone and role pings are left out on purpose — they are
// not aimed at you personally and would turn every deleted announcement into a false "ghost ping".

export interface PingMessage {
    author?: { id?: string; bot?: boolean; };
    mentions?: (string | { id?: string; })[];
    referenced_message?: { author?: { id?: string; }; } | null;
}

function mentionIds(message: PingMessage): string[] {
    return (message.mentions ?? [])
        .map(m => (typeof m === "string" ? m : m?.id))
        .filter((id): id is string => !!id);
}

/** True when this message mentions you by name or replies to a message of yours. */
export function pingsMe(message: PingMessage | undefined, myId: string | undefined): boolean {
    if (!message || !myId) return false;
    if (message.author?.id === myId) return false; // your own message is not a ghost ping
    if (mentionIds(message).includes(myId)) return true;
    return message.referenced_message?.author?.id === myId;
}
