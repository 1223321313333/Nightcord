/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Marks the QuickCSS editor window for the preload. The preload goes by the window rather than the URL of the page in
 * it, so that whatever ends up there (the plain editor, the error page of a failed load, a redirect from the CDN) only
 * gets the editor's three functions and never the full native API.
 */
export const QUICK_CSS_EDITOR_ARG = "--nightcord-quick-css-editor";
