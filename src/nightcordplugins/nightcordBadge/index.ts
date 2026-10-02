/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

// The list lives in the repository, so adding someone is just a commit. Only add people who asked for it:
// the file is public.
const BADGES_URL = "https://raw.githubusercontent.com/1223321313333/Nightcord/main/badges.json";
const SITE_URL = "https://1223321313333.github.io/Nightcord/";
const CACHE_KEY = "Nightcord_BadgeList";
const REFRESH_MS = 6 * 60 * 60 * 1000;

const MOON = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='#1d1f2a'/>" +
    "<path fill='#a78bfa' transform='translate(3.2 3.2) scale(.72)' d='M21.64 13.2a1 1 0 0 0-1.2-.26 7.5 7.5 0 0 1-9.38-9.38 1 1 0 0 0-1.46-1.2A10 10 0 1 0 21.9 14.4a1 1 0 0 0-.26-1.2Z'/></svg>"
);
// Distinct badge for the project's creator/developers: a gold moon with a small sparkle.
const DEV_MOON = "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='#1d1f2a'/>" +
    "<path fill='#fbbf24' transform='translate(2.6 3.4) scale(.66)' d='M21.64 13.2a1 1 0 0 0-1.2-.26 7.5 7.5 0 0 1-9.38-9.38 1 1 0 0 0-1.46-1.2A10 10 0 1 0 21.9 14.4a1 1 0 0 0-.26-1.2Z'/>" +
    "<path fill='#fff' d='M17.4 3.6l.62 1.63 1.63.62-1.63.62-.62 1.63-.62-1.63-1.63-.62 1.63-.62z'/></svg>"
);

export type BadgeEntry = string | { id: string; tooltip?: string; dev?: boolean; };
interface BadgeFile { users: BadgeEntry[]; }
interface Holder { tooltip: string; dev: boolean; }

const logger = new Logger("NightcordBadge");
let holders = new Map<string, Holder>();
let timer: ReturnType<typeof setInterval> | undefined;

/** Parse the public badge file into id -> { tooltip, dev }. Pure, shared with the tests. */
export function parseBadges(file: BadgeFile | undefined): Map<string, Holder> {
    const next = new Map<string, Holder>();
    for (const entry of file?.users ?? []) {
        const id = typeof entry === "string" ? entry : entry?.id;
        if (!/^\d{17,20}$/.test(id ?? "")) continue;
        const dev = typeof entry === "object" && !!entry.dev;
        const tooltip = (typeof entry === "object" && entry.tooltip) || (dev ? "Создатель Nightcord" : "Nightcord");
        next.set(id!, { tooltip, dev });
    }
    return next;
}

function setHolders(file: BadgeFile | undefined) {
    holders = parseBadges(file);
}

async function refresh() {
    try {
        const res = await fetch(BADGES_URL, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const file = await res.json() as BadgeFile;
        setHolders(file);
        await DataStore.set(CACHE_KEY, file);
    } catch (e) {
        logger.warn("Could not load the badge list, using the cached one", e);
    }
}

const badge: ProfileBadge = {
    id: "nightcord-user",
    getBadges({ userId }) {
        const holder = holders.get(userId);
        if (!holder) return [];
        return [{
            id: holder.dev ? "nightcord-dev" : "nightcord-user",
            description: holder.tooltip,
            iconSrc: holder.dev ? DEV_MOON : MOON,
            link: SITE_URL,
            position: BadgePosition.START,
            props: { style: { borderRadius: "50%" } }
        }];
    }
};

export default definePlugin({
    name: "NightcordBadge",
    description: "Shows a moon badge on the profiles of Nightcord users who opted in (visible to other Nightcord users). /nightcord-badge explains how to get one",
    tags: ["Appearance", "Fun"],
    authors: [Devs.Nightcord],
    dependencies: ["BadgeAPI"],
    enabledByDefault: true,
    userProfileBadges: [badge],

    commands: [{
        name: "nightcord-badge",
        description: "Как получить значок Nightcord",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: (_, ctx) => {
            const id = UserStore.getCurrentUser()?.id;
            if (id) copyWithToast(id, "ID скопирован");
            const has = id && holders.has(id);
            sendBotMessage(ctx.channel.id, {
                content: has
                    ? "🌙 У вас уже есть значок Nightcord! Его видят все, у кого стоит Nightcord."
                    : [
                        "🌙 **Значок Nightcord** — луна у вас в профиле, её видят все, у кого стоит Nightcord.",
                        `Ваш ID \`${id}\` уже скопирован. Отправьте его владельцу Nightcord, и он добавит вас в список.`,
                        "-# Список обладателей публичный: он лежит в файле badges.json на GitHub."
                    ].join("\n")
            });
        }
    }],

    async start() {
        setHolders(await DataStore.get<BadgeFile>(CACHE_KEY));
        refresh();
        timer = setInterval(refresh, REFRESH_MS);
    },

    stop() {
        clearInterval(timer);
    }
});
