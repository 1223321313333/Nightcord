/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure keyword-matching logic for KeywordHighlight, with no DOM, settings or webpack dependencies, so it
// can be unit tested. The wiring (reading settings, styling the matched rows) lives in index.tsx.

/** Split the comma-separated keyword setting into trimmed, non-empty keywords. */
export function parseKeywords(raw: string): string[] {
    return raw.split(",").map(w => w.trim()).filter(Boolean);
}

/** Escape a keyword so it is matched literally inside the combined regular expression. */
export const escapeKeyword = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A case-insensitive, Unicode-aware "whole word" matcher for the given words (so Russian words match too).
 * Words shorter than 2 characters are dropped and duplicates removed; returns null when nothing is left.
 */
export function buildMatcher(words: string[]): RegExp | null {
    const unique = [...new Set(words.filter(w => w && w.length >= 2))];
    return unique.length
        ? new RegExp(`(?<![\\p{L}\\p{N}])(${unique.map(escapeKeyword).join("|")})(?![\\p{L}\\p{N}])`, "iu")
        : null;
}
