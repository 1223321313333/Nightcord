/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

const CLASS = "nc-night";

const settings = definePluginSettings({
    startHour: {
        type: OptionType.SLIDER,
        description: "Night starts at (hour)",
        markers: [0, 3, 6, 9, 12, 15, 18, 21, 23],
        default: 23,
        stickToMarkers: false,
        onChange: () => update()
    },
    endHour: {
        type: OptionType.SLIDER,
        description: "Night ends at (hour)",
        markers: [0, 3, 6, 9, 12, 15, 18, 21, 23],
        default: 7,
        stickToMarkers: false,
        onChange: () => update()
    },
    brightness: {
        type: OptionType.SLIDER,
        description: "Brightness at night (1 = unchanged)",
        markers: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
        default: 0.8,
        stickToMarkers: false,
        onChange: () => update()
    }
});

let timer: ReturnType<typeof setInterval> | undefined;

export function isNight(hour: number, start: number, end: number) {
    start = Math.round(start);
    end = Math.round(end);
    if (start === end) return false;
    // e.g. 23 → 7 wraps past midnight
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function update() {
    const { startHour, endHour, brightness } = settings.store;
    const root = document.documentElement;
    root.style.setProperty("--nc-night-brightness", String(brightness));
    root.classList.toggle(CLASS, isNight(new Date().getHours(), startHour, endHour));
}

export default definePlugin({
    name: "NightSchedule",
    description: "Dims and warms Discord at night on a schedule (23:00–07:00 by default)",
    tags: ["Appearance"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,
    managedStyle: style,

    start() {
        update();
        timer = setInterval(update, 60_000);
    },

    stop() {
        clearInterval(timer);
        document.documentElement.classList.remove(CLASS);
        document.documentElement.style.removeProperty("--nc-night-brightness");
    }
});
