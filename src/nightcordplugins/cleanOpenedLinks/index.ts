/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins } from "@api/PluginManager";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

/**
 * ClearURLs only cleans links you send. Links other people send still carry utm_*, fbclid, si=, igsh and similar
 * parameters, which tell the site who shared the link with you. This cleans them right where Discord turns a
 * clicked link into the URL it opens, with the same ClearURLs rules.
 */
export default definePlugin({
    name: "CleanOpenedLinks",
    description: "Removes tracking parameters (utm, fbclid, si= and others) from links other people send before you open them, using the ClearURLs rules",
    tags: ["Privacy", "Utility"],
    authors: [Devs.Nightcord],
    dependencies: ["ClearURLs"],
    enabledByDefault: true,

    patches: [
        {
            find: "trackAnnouncementMessageLinkClicked({",
            replacement: {
                // the URL Discord opens and shows in its "Leaving Discord" dialog
                match: /(\i\(\)\.sanitizeUrl\()(\i)\.href\)/,
                replace: "$1$self.clean($2.href))"
            }
        }
    ],

    clean(href: string) {
        if (typeof href !== "string" || !/^https?:\/\//i.test(href)) return href;
        const clearUrls = plugins.ClearURLs as unknown as { rules?: unknown[]; replacer?(url: string): string; };
        if (!clearUrls?.rules?.length || !clearUrls.replacer) return href;
        try {
            return clearUrls.replacer(href);
        } catch {
            return href;
        }
    }
});
