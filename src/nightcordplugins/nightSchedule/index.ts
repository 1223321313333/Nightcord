/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Toasts } from "@webpack/common";

import style from "./style.css?managed";

const CLASS = "nc-night";
const READY_CLASS = "nc-night-ready";

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
    strength: {
        type: OptionType.SLIDER,
        description: "How much to dim and warm the screen at night (0 = off)",
        markers: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
        default: 0.18,
        stickToMarkers: false,
        onChange: () => update()
    }
});

let timer: ReturnType<typeof setInterval> | undefined;

/** Set from the toolbox; lasts until the schedule itself switches next time */
let manual: { on: boolean; scheduledWhenSet: boolean; } | null = null;

export function isNight(hour: number, start: number, end: number) {
    start = Math.round(start);
    end = Math.round(end);
    if (start === end) return false;
    // e.g. 23 → 7 wraps past midnight
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function scheduled() {
    return isNight(new Date().getHours(), settings.store.startHour, settings.store.endHour);
}

function update() {
    const root = document.documentElement;
    const now = scheduled();
    if (manual && manual.scheduledWhenSet !== now) manual = null;

    root.style.setProperty("--nc-night-strength", String(settings.store.strength));
    root.classList.add(READY_CLASS);
    root.classList.toggle(CLASS, manual ? manual.on : now);
}

function toggleNow() {
    const on = !document.documentElement.classList.contains(CLASS);
    manual = { on, scheduledWhenSet: scheduled() };
    update();
    Toasts.show({
        message: on ? "Ночной режим включён до утра по расписанию" : "Ночной режим выключен до следующего вечера",
        type: Toasts.Type.MESSAGE,
        id: Toasts.genId()
    });
}

export default definePlugin({
    name: "NightSchedule",
    description: "Gently dims and warms Discord at night on a schedule (23:00–07:00 by default). Can be switched by hand from the Nightcord toolbox.",
    tags: ["Appearance"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,
    managedStyle: style,

    toolboxActions: {
        "Ночной режим: переключить": toggleNow
    },

    start() {
        update();
        timer = setInterval(update, 60_000);
    },

    stop() {
        clearInterval(timer);
        manual = null;
        document.documentElement.classList.remove(CLASS, READY_CLASS);
        document.documentElement.style.removeProperty("--nc-night-strength");
    }
});
