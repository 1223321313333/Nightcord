/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PaletteCommand } from "../api/types";
import { BoltIcon, GearIcon, PaintIcon, RestartIcon } from "../ui/icons";
import { openSettingsPage } from "./openSettings";

const SECTION = "Nightcord";

export const nightcordCommands: PaletteCommand[] = [
    {
        id: "nightcord.settings",
        title: "Open Nightcord Settings",
        section: SECTION,
        keywords: ["nightcord", "nightcord", "settings"],
        icon: GearIcon,
        actions: [{
            id: "run",
            label: "Open Nightcord Settings",
            run: () => void openSettingsPage("nightcord_main")
        }]
    },
    {
        id: "nightcord.quickCss",
        title: "Open QuickCSS",
        section: SECTION,
        keywords: ["css", "quickcss", "editor", "style"],
        icon: PaintIcon,
        actions: [{
            id: "run",
            label: "Open QuickCSS",
            run: () => NightcordNative.quickCss.openEditor()
        }]
    },
    {
        id: "nightcord.updater",
        title: "Open Updater",
        section: SECTION,
        keywords: ["update", "updater", "version"],
        icon: BoltIcon,
        predicate: () => !IS_UPDATER_DISABLED,
        actions: [{
            id: "run",
            label: "Open Updater",
            run: () => void openSettingsPage("nightcord_updater")
        }]
    },
    {
        id: "nightcord.changelog",
        title: "Open Changelog",
        section: SECTION,
        keywords: ["changelog", "news", "whats new"],
        icon: BoltIcon,
        actions: [{
            id: "run",
            label: "Open Changelog",
            run: () => void openSettingsPage("nightcord_changelog")
        }]
    },
    {
        id: "nightcord.restart",
        title: "Restart Discord",
        section: SECTION,
        keywords: ["restart", "reload", "refresh"],
        icon: RestartIcon,
        actions: [{
            id: "run",
            label: "Restart Discord",
            run: () => window.location.reload()
        }]
    }
];
