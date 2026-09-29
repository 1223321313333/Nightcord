/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Lets shared APIs (context menus, toasts, notifications, notices, chat bar buttons) translate the
// fixed strings plugins pass to them. The translator is installed by the RussianNightcord plugin.
// This module has no imports on purpose: it is used by core modules that load before the dictionary.

type Translator = (text: string) => string;

let translator: Translator | null = null;

export function setUiTranslator(fn: Translator | null) {
    translator = fn;
}

export function hasUiTranslator() {
    return translator !== null;
}

/** Translate a plugin UI string if a translator is installed. Non-strings are returned unchanged. */
export function translateUi<T>(text: T): T {
    return translator !== null && typeof text === "string" ? translator(text) as T : text;
}
