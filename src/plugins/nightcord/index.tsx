/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings, Settings, SettingsStore, useSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React } from "@webpack/common";

import { buildThemeCss, FontId, FONTS, PresetId,PRESETS } from "./theme";

const STYLE_ID = "nightcord-theme";

const settings = definePluginSettings({
    palette: {
        type: OptionType.SELECT,
        description: "When to apply the Nightcord theme",
        options: [
            { label: "Only when no other theme is enabled", value: "auto", default: true },
            { label: "Always (on top of other themes)", value: "always" },
            { label: "Never", value: "never" }
        ],
        onChange: () => apply()
    },
    preset: {
        type: OptionType.SELECT,
        description: "Colour palette",
        options: Object.entries(PRESETS).map(([value, p], i) => ({ label: p.label, value, default: i === 0 })),
        onChange: () => apply()
    },
    accentColor: {
        type: OptionType.STRING,
        description: "Accent colour (any CSS colour, e.g. #8b5cf6). Leave empty to use the palette's own accent",
        default: "",
        onChange: () => apply()
    },
    rounded: {
        type: OptionType.BOOLEAN,
        description: "Rounder corners on buttons, cards and popups",
        default: true,
        onChange: () => apply()
    },
    font: {
        type: OptionType.SELECT,
        description: "Font (loaded from Google Fonts)",
        options: Object.entries(FONTS).map(([value, f], i) => ({ label: f.label, value, default: i === 0 })),
        onChange: () => apply()
    }
});

function otherThemes() {
    return [
        ...Settings.enabledThemes,
        ...Settings.themeLinks.map(l => l.replace(/^@(light|dark)\s+/, "").trim()).filter(Boolean)
    ];
}

function isActive() {
    const mode = settings.store.palette ?? "auto";
    return mode === "always" || (mode === "auto" && otherThemes().length === 0);
}

function apply() {
    let el = document.getElementById(STYLE_ID);
    if (!isActive()) {
        el?.remove();
        return;
    }
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = buildThemeCss({
        preset: (settings.store.preset ?? "violet") as PresetId,
        accent: settings.store.accentColor ?? "",
        rounded: settings.store.rounded ?? true,
        font: (settings.store.font ?? "default") as FontId
    });
}

function ThemeStatus() {
    // Re-render when themes are toggled elsewhere
    useSettings(["enabledThemes", "themeLinks"]);
    const others = otherThemes();
    const mode = settings.use(["palette"]).palette;

    if (mode === "never") return <Forms.FormText>Тема Nightcord выключена.</Forms.FormText>;
    if (!others.length || mode === "always") return <Forms.FormText>Тема Nightcord включена.</Forms.FormText>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Forms.FormText>
                Сейчас включена другая тема ({others.join(", ")}), поэтому тема Nightcord не применяется.
            </Forms.FormText>
            <Button
                size={Button.Sizes.SMALL}
                onClick={() => {
                    Settings.enabledThemes = [];
                    Settings.themeLinks = [];
                }}
            >
                Выключить другие темы и включить Nightcord
            </Button>
        </div>
    );
}

export default definePlugin({
    name: "Nightcord",
    description: "The Nightcord theme: 4 palettes, your accent colour, rounded corners and fonts. Lightweight and built on Discord's own variables. Also the /nightcord command",
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,
    settingsAboutComponent: ThemeStatus,

    commands: [{
        name: "nightcord",
        description: "Show Nightcord info",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: (_, ctx) => {
            const enabled = Object.values(plugins).filter(p => isPluginEnabled(p.name)).length;
            const preset = PRESETS[settings.store.preset as PresetId]?.label ?? settings.store.preset;
            const theme = document.getElementById(STYLE_ID) ? `тема «${preset}»` : "тема Nightcord выключена (включена другая тема)";
            sendBotMessage(ctx.channel.id, {
                content: `🌙 **Nightcord** работает. Включено плагинов: **${enabled}**, ${theme}.`
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
