/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";

// Nightcord: the donor lists come from Vencord's and Equicord's servers, which then see the user's IP address every
// 30 minutes, so they are only downloaded while the user has donor badges turned on. This lives apart from index.tsx,
// which Equicord changes often, so that syncing with Equicord does not conflict over it.

export type DonorBadgeList = Record<string, Array<Record<"tooltip" | "badge", string>>>;

let reload: (() => Promise<void>) | undefined;

export const donorBadgeSettings = definePluginSettings({
    donorBadges: {
        type: OptionType.BOOLEAN,
        description: "Show Vencord and Equicord donor badges. The lists are downloaded from badges.vencord.dev and badge.equicord.org every 30 minutes, so those servers see your IP address",
        default: false,
        onChange: () => void reload?.()
    }
});

/**
 * Downloads both donor lists with `load` and hands them to `apply`. While donor badges are off it makes no request
 * and hands over empty lists. The lists load independently: one that fails (host blocked or down) is passed as
 * undefined so the caller keeps its previous list, and the other still loads. Download failures do not reject.
 */
export async function loadDonorBadges(
    load: (url: string, noCache: boolean) => Promise<DonorBadgeList>,
    apply: (vencord: DonorBadgeList | undefined, equicord: DonorBadgeList | undefined) => void,
    noCache = false
) {
    reload = () => loadDonorBadges(load, apply);
    if (!donorBadgeSettings.store.donorBadges) return apply({}, {});

    const [vencord, equicord] = await Promise.allSettled([
        load("https://badges.vencord.dev/badges.json", noCache),
        load("https://badge.equicord.org/badges.json", noCache)
    ]);

    // turned off while downloading: drop what arrived
    if (!donorBadgeSettings.store.donorBadges) return apply({}, {});
    apply(vencord.status === "fulfilled" ? vencord.value : undefined, equicord.status === "fulfilled" ? equicord.value : undefined);

    const failed = [vencord.status === "rejected" && "Vencord", equicord.status === "rejected" && "Equicord"].filter(Boolean);
    if (failed.length) new Logger("BadgeAPI").warn(`Could not load ${failed.join(" and ")} donor badges (network or host unavailable)`);
}
