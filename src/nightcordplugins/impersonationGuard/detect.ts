/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Recognises when a message author copies the name (and maybe avatar) of one of your friends but is a
// different account -- the "fake friend / fake mod" scam. Pure, no imports, so the tests can run it. Only your
// own friends are the reference, which keeps false positives low.

export interface FriendRef {
    id: string;
    name: string;
    avatar?: string | null;
    /** Other names this friend is known by (e.g. their @username), also treated as theirs */
    aliases?: string[];
}

export interface Impersonation {
    friend: string;
    /** The fake also uses the same avatar -- a much stronger sign */
    sameAvatar: boolean;
}

// Whitespace (incl. non-breaking space) and format characters (zero-width, bidi overrides, BOM). Written as
// Unicode property escapes so the source itself stays plain ASCII.
const INVISIBLE = /[\p{White_Space}\p{Cf}]/gu;

/** Lower-case, fold compatibility forms and drop spacing/invisible characters, so look-alike names collapse. */
export function normalizeName(name: string | null | undefined): string {
    return (name ?? "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(INVISIBLE, "");
}

/** Index friends (and their aliases) by normalized name. */
export function buildFriendMap(friends: FriendRef[]): Map<string, FriendRef> {
    const map = new Map<string, FriendRef>();
    for (const f of friends) {
        for (const key of [f.name, ...(f.aliases ?? [])]) {
            const n = normalizeName(key);
            if (n) map.set(n, f);
        }
    }
    return map;
}

/**
 * Checks an author's possible names against the friend map. Returns the impersonated friend, or null.
 * The author's own id is excluded so a friend on their real account never trips it.
 */
export function findImpersonation(
    names: (string | null | undefined)[],
    authorId: string,
    authorAvatar: string | null | undefined,
    friendsByName: Map<string, FriendRef>
): Impersonation | null {
    for (const raw of names) {
        const n = normalizeName(raw);
        if (!n) continue;
        const entry = friendsByName.get(n);
        if (entry && entry.id !== authorId) {
            return { friend: entry.name, sameAvatar: !!authorAvatar && authorAvatar === entry.avatar };
        }
    }
    return null;
}
