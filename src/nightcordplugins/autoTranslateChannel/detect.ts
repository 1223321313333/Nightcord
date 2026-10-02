/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Decides whether a message is worth sending to the translator. Pure, no imports, so the tests can run it.
// Messages that are only links, custom emoji, mentions or numbers have nothing to translate.

/** True when the text has real words left after stripping links, custom emoji and mentions. */
export function isTranslatable(content: string | null | undefined): boolean {
    if (!content) return false;
    const stripped = content
        .replace(/https?:\/\/\S+/g, "")
        .replace(/<a?:\w+:\d+>/g, "")
        .replace(/<[@#][!&]?\d+>/g, "")
        .trim();
    return /\p{L}/u.test(stripped);
}
