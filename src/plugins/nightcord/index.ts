/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings, Settings, SettingsStore } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const STYLE_ID = "nightcord-theme";
const DEFAULT_ACCENT = "#8b5cf6";

const settings = definePluginSettings({
    palette: {
        type: OptionType.SELECT,
        description: "When to apply Nightcord's night palette and accent colour",
        options: [
            { label: "Only when no other theme is enabled", value: "auto", default: true },
            { label: "Always (on top of other themes)", value: "always" },
            { label: "Never", value: "never" }
        ],
        onChange: () => apply()
    },
    accentColor: {
        type: OptionType.STRING,
        description: "Accent colour (any CSS colour, e.g. #8b5cf6)",
        default: DEFAULT_ACCENT,
        onChange: () => apply()
    }
});

// Discord's current surface variables, darkest to lightest, plus the legacy names older CSS still reads
const PALETTE = `
    --background-base-lowest: #0b0c11;
    --background-base-lower: #0f1016;
    --background-base-low: #13141b;
    --background-surface-high: #181a23;
    --background-surface-higher: #1d1f2a;
    --background-surface-highest: #222533;
    --bg-surface-raised: #181a23;
    --bg-base-primary: #13141b;
    --bg-base-secondary: #0f1016;
    --bg-base-tertiary: #0b0c11;
    --background-primary: #13141b;
    --background-secondary: #0f1016;
    --background-secondary-alt: #0d0e13;
    --background-tertiary: #0b0c11;
    --background-floating: #0f1016;
    --channeltextarea-background: #181a23;
    --scrollbar-auto-thumb: #2a2d3d;
    --scrollbar-thin-thumb: #2a2d3d;
`;

function hasOtherTheme() {
    return Settings.enabledThemes.length > 0
        || Settings.themeLinks.some(l => l.replace(/^@(light|dark)\s+/, "").trim());
}

/** Turns any CSS colour into Discord's "h s% l%" format so the -hsl variables match */
function toHsl(color: string) {
    const probe = document.createElement("div");
    probe.style.color = color;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [139, 92, 246];
    probe.remove();

    const [r, g, b] = rgb.map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
    }
    return { h: +h.toFixed(1), s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
}

function accentVars(color: string) {
    const { h, s, l } = toHsl(color);
    const darker = Math.max(l - 6, 0);
    return `
    --nightcord-accent: ${color};
    --brand-500: hsl(${h} ${s}% ${l}%);
    --brand-500-hsl: ${h} ${s}% ${l}%;
    --brand-530: hsl(${h} ${s}% ${darker}%);
    --brand-530-hsl: ${h} ${s}% ${darker}%;
    --brand-560: hsl(${h} ${s}% ${Math.max(l - 10, 0)}%);
    --brand-560-hsl: ${h} ${s}% ${Math.max(l - 10, 0)}%;
    --control-brand-foreground: hsl(${h} ${s}% ${Math.min(l + 8, 90)}%);
    --text-link: hsl(${h} ${s}% ${Math.min(l + 12, 90)}%);
`;
}

function apply() {
    const mode = settings.store.palette ?? "auto";
    const enabled = mode === "always" || (mode === "auto" && !hasOtherTheme());

    let el = document.getElementById(STYLE_ID);
    if (!enabled) {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }

    const accent = settings.store.accentColor?.trim() || DEFAULT_ACCENT;
    el.textContent = `
:root { ${accentVars(accent)} }
.theme-dark { ${PALETTE} }
::selection { background: color-mix(in srgb, var(--nightcord-accent) 45%, transparent); }
`;
}

export default definePlugin({
    name: "Nightcord",
    description: "Nightcord's night palette and accent colour (steps aside when you enable another theme), plus the /nightcord command",
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,

    commands: [{
        name: "nightcord",
        description: "Show Nightcord info",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: (_, ctx) => {
            const enabled = Object.values(plugins).filter(p => isPluginEnabled(p.name)).length;
            const palette = document.getElementById(STYLE_ID) ? "on" : "off (another theme is active)";
            sendBotMessage(ctx.channel.id, {
                content: `🌙 **Nightcord** is running. Plugins enabled: **${enabled}**. Palette: ${palette}. Accent: \`${settings.store.accentColor}\``
            });
        }
    }],

    start() {
        apply();
        SettingsStore.addChangeListener("enabledThemes", apply);
        SettingsStore.addChangeListener("themeLinks", apply);
    },

    stop() {
        SettingsStore.removeChangeListener("enabledThemes", apply);
        SettingsStore.removeChangeListener("themeLinks", apply);
        document.getElementById(STYLE_ID)?.remove();
    }
});
