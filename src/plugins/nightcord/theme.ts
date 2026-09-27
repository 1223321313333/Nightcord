/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * The Nightcord theme is built only from Discord's CSS variables.
 * No class selectors and no :has(), so it is cheap to render and survives Discord's class renames.
 */

export interface Preset {
    label: string;
    accent: string;
    /** Surfaces from darkest to lightest: lowest, lower, low, high, higher, highest */
    surfaces: [string, string, string, string, string, string];
    text: { strong: string; normal: string; muted: string; channels: string; };
}

export const PRESETS = {
    violet: {
        label: "Ночной фиолетовый",
        accent: "#8b5cf6",
        surfaces: ["#0b0c11", "#0f1016", "#13141b", "#181a23", "#1d1f2a", "#222533"],
        text: { strong: "#f4f2fb", normal: "#dcd9e8", muted: "#8f8aa6", channels: "#9d98b5" }
    },
    amoled: {
        label: "Чёрный (AMOLED)",
        accent: "#a78bfa",
        surfaces: ["#000000", "#050506", "#0a0a0c", "#111114", "#17171b", "#1d1d22"],
        text: { strong: "#ffffff", normal: "#dedede", muted: "#8a8a8a", channels: "#9a9a9a" }
    },
    blue: {
        label: "Полночный синий",
        accent: "#60a5fa",
        surfaces: ["#070b14", "#0b111c", "#0f1624", "#141c2d", "#192336", "#1f2a40"],
        text: { strong: "#f1f5fb", normal: "#d6deea", muted: "#8392aa", channels: "#91a0b8" }
    },
    rose: {
        label: "Розовая ночь",
        accent: "#f472b6",
        surfaces: ["#100b0e", "#150f13", "#1a1318", "#21181f", "#281d26", "#30222d"],
        text: { strong: "#fbf2f7", normal: "#e8d9e2", muted: "#a58c9b", channels: "#b39aa9" }
    }
} satisfies Record<string, Preset>;

export type PresetId = keyof typeof PRESETS;

export const FONTS = {
    default: { label: "Как в Discord", family: null, url: null },
    inter: { label: "Inter", family: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    manrope: { label: "Manrope", family: "Manrope", url: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" },
    nunito: { label: "Nunito", family: "Nunito", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" }
} as const;

export type FontId = keyof typeof FONTS;

/** Any CSS colour → [h, s, l] */
export function toHsl(color: string): [number, number, number] {
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
    return [+h.toFixed(1), +(s * 100).toFixed(1), +(l * 100).toFixed(1)];
}

function accentVars(color: string) {
    const [h, s, l] = toHsl(color);
    const shade = (dl: number) => `${h} ${s}% ${Math.min(Math.max(l + dl, 0), 95)}%`;
    return `
    --nightcord-accent: ${color};
    --brand-500: hsl(${shade(0)});
    --brand-500-hsl: ${shade(0)};
    --brand-530: hsl(${shade(-6)});
    --brand-530-hsl: ${shade(-6)};
    --brand-560: hsl(${shade(-10)});
    --brand-560-hsl: ${shade(-10)};
    --control-brand-foreground: hsl(${shade(8)});
    --text-link: hsl(${shade(12)});
    --text-brand: hsl(${shade(8)});
    --icon-brand: hsl(${shade(8)});
    --mention-foreground: hsl(${shade(18)});
    --mention-background: hsl(${shade(0)} / 0.22);
    --message-mentioned-background-default: hsl(${shade(0)} / 0.1);
    --message-mentioned-background-hover: hsl(${shade(0)} / 0.14);
    --interactive-background-hover: hsl(${shade(0)} / 0.08);
    --interactive-background-active: hsl(${shade(0)} / 0.18);
    --interactive-background-selected: hsl(${shade(0)} / 0.16);
    --border-focus: hsl(${shade(8)});
`;
}

function paletteVars(p: Preset) {
    const [lowest, lower, low, high, higher, highest] = p.surfaces;
    return `
    --background-base-lowest: ${lowest};
    --background-base-lower: ${lower};
    --background-base-low: ${low};
    --background-surface-high: ${high};
    --background-surface-higher: ${higher};
    --background-surface-highest: ${highest};
    --bg-surface-raised: ${high};
    --bg-base-primary: ${low};
    --bg-base-secondary: ${lower};
    --bg-base-tertiary: ${lowest};
    --background-primary: ${low};
    --background-secondary: ${lower};
    --background-secondary-alt: ${lower};
    --background-tertiary: ${lowest};
    --background-floating: ${lower};
    --app-frame-background: ${lowest};
    --chat-background-default: ${low};
    --modal-background: ${lower};
    --modal-footer-background: ${lowest};
    --card-background-default: ${high};
    --input-background-default: ${high};
    --channeltextarea-background: ${high};
    --message-background-hover: rgb(255 255 255 / 0.025);
    --border-subtle: rgb(255 255 255 / 0.04);
    --border-muted: rgb(255 255 255 / 0.06);
    --border-normal: rgb(255 255 255 / 0.09);
    --border-strong: rgb(255 255 255 / 0.14);
    --app-frame-border: rgb(255 255 255 / 0.05);
    --scrollbar-auto-thumb: ${highest};
    --scrollbar-thin-thumb: ${highest};
    --text-strong: ${p.text.strong};
    --text-default: ${p.text.normal};
    --text-muted: ${p.text.muted};
    --text-subtle: ${p.text.muted};
    --channels-default: ${p.text.channels};
    --interactive-text-default: ${p.text.channels};
    --interactive-text-hover: ${p.text.normal};
    --interactive-text-active: ${p.text.strong};
`;
}

const ROUNDED = `
    --radius-xs: 6px;
    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 18px;
`;

export interface ThemeOptions {
    preset: PresetId;
    accent: string;
    rounded: boolean;
    font: FontId;
}

export function buildThemeCss({ preset, accent, rounded, font }: ThemeOptions) {
    const p = PRESETS[preset] ?? PRESETS.violet;
    const f = FONTS[font] ?? FONTS.default;
    const dark = ".theme-dark, .theme-darker, .theme-midnight";

    return [
        f.url && `@import url("${f.url}");`,
        `:root { ${accentVars(accent.trim() || p.accent)} }`,
        `${dark} { ${paletteVars(p)} }`,
        rounded && `:root { ${ROUNDED} }`,
        f.family && `:root { --font-primary: "${f.family}", "gg sans", sans-serif; --font-display: "${f.family}", "gg sans", sans-serif; --font-headline: "${f.family}", "gg sans", sans-serif; }`,
        "::selection { background: color-mix(in srgb, var(--nightcord-accent) 45%, transparent); }"
    ].filter(Boolean).join("\n");
}
