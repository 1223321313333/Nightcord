/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { filters, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { Toasts } from "@webpack/common";

const logger = new Logger("PrivacyGuard");

const ConsentStore = findStoreLazy("ConsentStore");
const ConsentActions: {
    fetchConsents(): Promise<unknown>;
    setConsents(grant: string[], revoke: string[]): Promise<unknown>;
} = mapMangledModuleLazy('type:"UPDATE_CONSENTS"', {
    fetchConsents: filters.byCode(".get({"),
    setConsents: filters.byCode(".post({")
});

/** Data-use consents Discord turns back on from its mobile app, prompts or new features */
const GUARDED: Record<string, string> = {
    usage_statistics: "использование данных для улучшения Discord",
    personalization: "персонализацию по вашим данным"
};

let busy = false;
let lastRevoke = 0;

async function enforce() {
    if (busy || !ConsentStore.fetchedConsents) return;
    const turnedOn = Object.keys(GUARDED).filter(type => ConsentStore.hasConsented(type));
    // never fight Discord in a loop: at most once a minute
    if (!turnedOn.length || Date.now() - lastRevoke < 60_000) return;

    busy = true;
    lastRevoke = Date.now();
    try {
        await ConsentActions.setConsents([], turnedOn);
        Toasts.show({
            message: `🛡️ Discord снова включил ${turnedOn.map(t => GUARDED[t]).join(" и ")} — выключено обратно`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId()
        });
        logger.info("Revoked", turnedOn);
    } catch (err) {
        logger.warn("Could not revoke consents", err);
    } finally {
        busy = false;
    }
}

export default definePlugin({
    name: "PrivacyGuard",
    description: "Keeps Discord's data-use consents (improving Discord, personalisation) off: when Discord turns them back on, they are switched off again",
    tags: ["Privacy"],
    authors: [Devs.Nightcord],

    flux: {
        CONNECTION_OPEN() {
            ConsentActions.fetchConsents().catch(() => { });
        },
        UPDATE_CONSENTS() {
            setTimeout(enforce, 1000);
        }
    },

    start() {
        if (ConsentStore.fetchedConsents) void enforce();
        else ConsentActions.fetchConsents().catch(err => logger.warn("Could not load consents", err));
    }
});
