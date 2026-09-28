/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// The strings live in @utils/i18n; this plugin is just the on/off switch.
export default definePlugin({
    name: "RussianNightcord",
    description: "Translates Nightcord's settings (sections, tabs, buttons, hints) into Russian. Plugin names stay in English.",
    tags: ["Customisation"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    requiresRestart: true
});
