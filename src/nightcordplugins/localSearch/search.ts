/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Ranks locally indexed messages against a query. Pure, no imports, so the tests can run it. Supports plain
// words (all must appear), an exact-phrase bonus, newest-first ordering, and a "from:name" author filter.

export interface IndexedMsg {
    id: string;
    channelId: string;
    guildId?: string;
    authorId: string;
    authorName: string;
    content: string;
    ts: number;
}

/** Big enough to always win over any realistic timestamp, so phrase matches sort above plain ones. */
const PHRASE_BONUS = 1e15;

export interface ParsedQuery {
    terms: string[];
    from: string[];
}

export function parseQuery(query: string): ParsedQuery {
    const terms: string[] = [];
    const from: string[] = [];
    for (const part of (query ?? "").trim().toLowerCase().split(/\s+/)) {
        if (!part) continue;
        if (part.startsWith("from:") && part.length > 5) from.push(part.slice(5));
        else terms.push(part);
    }
    return { terms, from };
}

/** Newest-first matches. A query of only "from:" returns that author's messages; an empty query returns none. */
export function searchMessages(records: IndexedMsg[], query: string, limit = 50): IndexedMsg[] {
    const { terms, from } = parseQuery(query);
    if (!terms.length && !from.length) return [];

    const phrase = terms.join(" ");
    const scored: { score: number; r: IndexedMsg; }[] = [];

    for (const r of records) {
        if (from.length) {
            const name = (r.authorName ?? "").toLowerCase();
            if (!from.every(f => name.includes(f))) continue;
        }
        const content = (r.content ?? "").toLowerCase();
        if (terms.length && !terms.every(t => content.includes(t))) continue;

        let score = r.ts;
        if (phrase && content.includes(phrase)) score += PHRASE_BONUS;
        scored.push({ score, r });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(0, limit)).map(s => s.r);
}
