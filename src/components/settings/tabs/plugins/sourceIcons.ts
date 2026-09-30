/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Built-in icons for where a plugin comes from. They used to load from equicord.org every time the plugin
// list was opened, which showed Equicord's server the user's IP address and that they run a Discord mod.

function letterIcon(letter: string, color: string) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='11' fill='${color}'/>`
        + `<text x='12' y='16.4' font-family='Arial,sans-serif' font-size='13' font-weight='700' text-anchor='middle' fill='#fff'>${letter}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SOURCE_ICONS = {
    vencord: letterIcon("V", "#e0719e"),
    equicord: letterIcon("E", "#6f78e8"),
    modified: letterIcon("M", "#d6912a"),
    user: letterIcon("U", "#3a9d5d")
};
