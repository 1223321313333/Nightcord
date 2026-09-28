/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { healthIssues } from "@utils/health";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { getBuildNumber, patches } from "@webpack/patcher";

const KEY = "Nightcord_LastCheck";
const CHECK_DELAY = 45_000;

const settings = definePluginSettings({
    notifyAfterUpdate: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when plugins break after a Discord update",
        default: true
    },
    verboseLogs: {
        type: OptionType.BOOLEAN,
        description: "Detailed Nightcord logs in the console (DevTools). Off: only warnings and errors are printed",
        default: false,
        onChange: (v: boolean) => { Logger.verbose = v || IS_DEV || IS_REPORTER; }
    }
});

const KIND_TEXT = {
    "patch-no-effect": "патч не сработал: Discord изменил код, часть функций плагина может не работать",
    "patch-error": "патч вызвал ошибку и был отключён",
    "start-failed": "плагин не смог запуститься",
} as const;

function collect() {
    const byPlugin = new Map<string, Set<string>>();
    let missingModules = 0;

    for (const issue of healthIssues) {
        if (issue.kind === "module-not-found" || !issue.plugin) {
            missingModules++;
            continue;
        }
        // Internal API plugins are shared by many plugins; report them too, they matter
        const set = byPlugin.get(issue.plugin) ?? new Set();
        set.add(KIND_TEXT[issue.kind]);
        byPlugin.set(issue.plugin, set);
    }

    // Patches that have not found their module yet. Many live in parts of Discord you haven't opened.
    const waiting = new Set(patches.filter(p => !p.all).map(p => p.plugin));
    const enabled = Object.values(plugins).filter(p => isPluginEnabled(p.name) && !p.hidden).length;

    return { byPlugin, missingModules, waiting, enabled };
}

function buildReport() {
    const { byPlugin, missingModules, waiting, enabled } = collect();
    const build = getBuildNumber();
    const lines = [`🩺 **Проверка Nightcord** · сборка Discord ${build === -1 ? "неизвестна" : build} · включено плагинов: ${enabled}`];

    if (!byPlugin.size && !missingModules) {
        lines.push("", "✅ Ошибок не найдено, все патчи сработали.");
    } else {
        if (byPlugin.size) {
            lines.push("", "**Сломались после обновления Discord:**");
            for (const [plugin, problems] of byPlugin) lines.push(`❌ **${plugin}** — ${[...problems].join("; ")}`);
        }
        if (missingModules) {
            lines.push("", `⚠️ Не найдено внутренних частей Discord: **${missingModules}**. Какие-то функции могут не работать.`);
        }
        lines.push("", "Что делать: подождите исправления (Nightcord обновится сам) или выключите сломанный плагин во вкладке «Плагины».");
    }

    if (waiting.size) {
        lines.push("", `-# Ещё не проверены (эти части Discord пока не открывались): ${[...waiting].join(", ")}`);
    }

    return lines.join("\n");
}

async function notifyIfBroken() {
    if (!settings.store.notifyAfterUpdate) return;

    const { byPlugin } = collect();
    const broken = [...byPlugin.keys()].sort();
    const build = getBuildNumber();

    const last = await DataStore.get<{ build: number; broken: string[]; }>(KEY);
    await DataStore.set(KEY, { build, broken });

    if (!broken.length) return;
    // Only speak up when something new broke, not on every launch
    const known = last?.broken ?? [];
    if (last?.build === build && broken.every(p => known.includes(p))) return;

    showNotification({
        title: "Nightcord: после обновления Discord сломались плагины",
        body: `${broken.join(", ")}. Подробности — команда /check.`,
        permanent: true
    });
}

let timer: ReturnType<typeof setTimeout> | undefined;

export default definePlugin({
    name: "NightcordCheck",
    description: "/check shows which plugins broke after a Discord update; also notifies you automatically",
    tags: ["Utility", "Developers"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,

    commands: [{
        name: "check",
        description: "Проверить, какие плагины Nightcord сломались",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: (_, ctx) => {
            sendBotMessage(ctx.channel.id, { content: buildReport() });
        }
    }],

    start() {
        Logger.verbose = settings.store.verboseLogs || IS_DEV || IS_REPORTER;
        // Give Discord time to load its main parts before judging
        timer = setTimeout(notifyIfBroken, CHECK_DELAY);
    },

    stop() {
        clearTimeout(timer);
    }
});
