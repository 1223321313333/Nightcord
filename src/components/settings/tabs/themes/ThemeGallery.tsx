/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord theme gallery: the built-in Nightcord palettes and a few well-known community themes. Instead of
// screenshots from some image host, "Try" turns a theme on for 30 seconds right here, then puts things back unless
// the user keeps it.

import { popNotice, showNotice } from "@api/Notices";
import { isPluginEnabled, plugins, startPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { PRESETS } from "@nightcordplugins/nightcord/theme";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { Alerts, React, showToast, Toasts } from "@webpack/common";

interface CommunityTheme {
    name: string;
    author: string;
    description: string;
    url: string;
    /** a few colours for the card, taken from the theme */
    colors: string[];
}

// Checked: each loads only from GitHub and Google Fonts, which strict connections allows
const COMMUNITY: CommunityTheme[] = [
    {
        name: "Catppuccin Mocha",
        author: "Catppuccin",
        description: "Soft pastel dark theme, one of the most popular",
        url: "https://catppuccin.github.io/discord/dist/catppuccin-mocha.theme.css",
        colors: ["#11111b", "#1e1e2e", "#313244", "#cba6f7", "#f5c2e7"]
    },
    {
        name: "Midnight",
        author: "refact0r",
        description: "Dark theme with floating panels and rounded corners",
        url: "https://refact0r.github.io/midnight-discord/build/midnight.css",
        colors: ["#000000", "#0a0a0a", "#171717", "#a0a0ff", "#ffffff"]
    },
    {
        name: "System24",
        author: "refact0r",
        description: "Looks like a terminal: monospace font and text-mode frames",
        url: "https://refact0r.github.io/system24/build/system24.css",
        colors: ["#000000", "#0c0c0c", "#1f1f1f", "#a0c4ff", "#dddddd"]
    },
    {
        name: "ClearVision",
        author: "ClearVision",
        description: "Classic theme with a background picture and see-through panels",
        url: "https://clearvision.github.io/ClearVision-v7/main.css",
        colors: ["#1e2124", "#2f3136", "#36393f", "#2780e6", "#ffffff"]
    },
    {
        name: "Nordic",
        author: "orblazer",
        description: "Cold northern Nord palette",
        url: "https://raw.githubusercontent.com/orblazer/discord-nordic/master/nordic.theme.css",
        colors: ["#242933", "#2e3440", "#3b4252", "#88c0d0", "#eceff4"]
    }
];

const TRY_SECONDS = 30;
let trial: { url: string; added: boolean; timer: ReturnType<typeof setTimeout>; } | null = null;

function endTrial(keep: boolean) {
    if (!trial) return;
    clearTimeout(trial.timer);
    const { url, added } = trial;
    trial = null;
    popNotice();
    if (keep) {
        showToast(t("Theme kept"), Toasts.Type.SUCCESS);
        return;
    }
    Settings.enabledThemeLinks = Settings.enabledThemeLinks.filter(l => l !== url);
    if (added) Settings.themeLinks = Settings.themeLinks.filter(l => l !== url);
}

function enableLink(url: string) {
    const added = !Settings.themeLinks.includes(url);
    if (added) Settings.themeLinks = [...Settings.themeLinks, url];
    if (!Settings.enabledThemeLinks.includes(url)) Settings.enabledThemeLinks = [...Settings.enabledThemeLinks, url];
    if (Settings.enableOnlineThemes === false) Settings.enableOnlineThemes = true;
    return added;
}

function tryTheme(theme: CommunityTheme) {
    endTrial(false);
    const added = enableLink(theme.url);
    trial = { url: theme.url, added, timer: setTimeout(() => endTrial(false), TRY_SECONDS * 1000) };
    showNotice(`${t("Trying")} ${theme.name}: ${t("it goes away in 30 seconds.")}`, t("Keep it"), () => endTrial(true));
}

function useNightcordPreset() {
    const s = useSettings(["plugins.Nightcord.preset", "plugins.Nightcord.enabled", "enabledThemeLinks", "enabledThemes"]);
    return {
        preset: s.plugins.Nightcord?.preset ?? Object.keys(PRESETS)[0],
        nightcordOn: s.plugins.Nightcord?.enabled ?? false,
        otherThemes: s.enabledThemeLinks.length + s.enabledThemes.length
    };
}

function choosePalette(id: string) {
    const apply = () => {
        Settings.plugins.Nightcord.preset = id;
        if (!isPluginEnabled("Nightcord")) {
            Settings.plugins.Nightcord.enabled = true;
            startPlugin(plugins.Nightcord);
        }
    };
    const others = Settings.enabledThemeLinks.length + Settings.enabledThemes.length;
    if (!others || Settings.plugins.Nightcord?.palette === "always") return apply();

    Alerts.show({
        title: t("Turn off your other themes?"),
        body: t("The Nightcord palette shows only when no other theme is on. Your themes stay installed, you can turn them on again below."),
        confirmText: t("Turn them off"),
        cancelText: t("Cancel"),
        onConfirm() {
            Settings.enabledThemeLinks = [];
            Settings.enabledThemes = [];
            apply();
        }
    });
}

const card: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 10,
    background: "var(--background-surface-high, var(--background-secondary))",
    border: "1px solid var(--border-subtle, transparent)"
};

function Swatches({ colors }: { colors: string[]; }) {
    return (
        <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border-subtle, transparent)" }}>
            {colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
        </div>
    );
}

export function ThemeGallery() {
    const { preset, nightcordOn, otherThemes } = useNightcordPreset();
    const links = useSettings(["enabledThemeLinks"]).enabledThemeLinks;

    return (
        <section>
            <Heading className={Margins.top20}>{t("Theme gallery")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Nightcord's own palettes are built in and light. Community themes load from GitHub; press Try to see one on your Discord for 30 seconds.")}
            </Paragraph>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                {Object.entries(PRESETS).map(([id, p]) => {
                    const active = nightcordOn && preset === id && !otherThemes;
                    return (
                        <div key={id} style={{ ...card, outline: active ? "2px solid var(--brand-500, #5865f2)" : undefined }}>
                            <Swatches colors={[...p.surfaces.slice(0, 4), p.accent]} />
                            <div style={{ fontWeight: 600, color: "var(--text-strong, var(--header-primary))" }}>🌙 {p.label}</div>
                            <Paragraph size="sm">{t("Built into Nightcord")}</Paragraph>
                            <Button size="small" variant={active ? "secondary" : "primary"} disabled={active} onClick={() => choosePalette(id)}>
                                {active ? t("On") : t("Turn on")}
                            </Button>
                        </div>
                    );
                })}

                {COMMUNITY.map(theme => {
                    const on = links.includes(theme.url);
                    return (
                        <div key={theme.url} style={{ ...card, outline: on ? "2px solid var(--brand-500, #5865f2)" : undefined }}>
                            <Swatches colors={theme.colors} />
                            <div style={{ fontWeight: 600, color: "var(--text-strong, var(--header-primary))" }}>{theme.name}</div>
                            <Paragraph size="sm" style={{ flex: 1 }}>{t(theme.description)} · {theme.author}</Paragraph>
                            <div style={{ display: "flex", gap: 6 }}>
                                {on ? (
                                    <Button size="small" variant="secondary" onClick={() => {
                                        if (trial?.url === theme.url) endTrial(false);
                                        else Settings.enabledThemeLinks = Settings.enabledThemeLinks.filter(l => l !== theme.url);
                                    }}>{t("Turn off")}</Button>
                                ) : (
                                    <>
                                        <Button size="small" variant="secondary" onClick={() => tryTheme(theme)}>{t("Try")}</Button>
                                        <Button size="small" onClick={() => { endTrial(false); enableLink(theme.url); }}>{t("Turn on")}</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
