/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

const STYLE_ID = "nightcord-accent";

const settings = definePluginSettings({
    accentColor: {
        type: OptionType.STRING,
        description: "Accent colour (any CSS colour, e.g. #8b5cf6)",
        default: "#8b5cf6",
        onChange: () => applyAccent()
    }
});

function applyAccent() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    const c = settings.store.accentColor || "#8b5cf6";
    el.textContent = `:root { --nightcord-accent: ${c}; --brand-500: ${c}; --brand-560: ${c}; --control-brand-foreground: ${c}; --text-link: ${c}; }`;
}

export default definePlugin({
    name: "Nightcord",
    description: "Nightcord's built-in dark theme, accent colour and /nightcord command",
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,
    managedStyle: style,

    commands: [{
        name: "nightcord",
        description: "Show Nightcord info",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: (_, ctx) => {
            const enabled = Object.values(plugins).filter(p => isPluginEnabled(p.name)).length;
            sendBotMessage(ctx.channel.id, {
                content: `🌙 **Nightcord** is running. Plugins enabled: **${enabled}**. Accent: \`${settings.store.accentColor}\``
            });
        }
    }],

    start() {
        applyAccent();
    },

    stop() {
        document.getElementById(STYLE_ID)?.remove();
    }
});
