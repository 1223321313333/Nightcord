/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { setUiTranslator } from "@api/UiTranslation";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";

// The strings live in @utils/i18n; this plugin is just the on/off switch.
export default definePlugin({
    name: "RussianNightcord",
    description: "Translates Nightcord's settings and plugin descriptions into Russian. Plugin names stay in English.",
    tags: ["Customisation"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    requiresRestart: true,

    // Also translate the fixed strings plugins show in menus, toasts, notifications and chat bar buttons
    start() {
        setUiTranslator(t);
    },
    stop() {
        setUiTranslator(null);
    }
});
