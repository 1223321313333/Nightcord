/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { ScamHit, scanForScams } from "./detect";

/** Message text plus any text an embed carries, since scam bots hide the link in an embed. */
function textOf(message?: Message): string {
    if (!message) return "";
    let text = message.content ?? "";
    for (const embed of (message.embeds ?? []) as any[]) {
        if (embed?.rawDescription) text += "\n" + embed.rawDescription;
        else if (embed?.description) text += "\n" + embed.description;
        if (typeof embed?.url === "string") text += "\n" + embed.url;
        if (Array.isArray(embed?.fields)) for (const f of embed.fields) text += "\n" + (f?.rawValue ?? f?.value ?? "");
    }
    return text;
}

function describe(hit: ScamHit): string {
    switch (hit.reason) {
        case "typosquat":
            return `«${hit.host}» ${t("looks almost like a real address but is misspelled — a trick used to disguise fake sites.")}`;
        case "masked":
            return `${t("The link shows")} «${hit.shownAs}», ${t("but it actually goes to")} «${hit.host}».`;
        default:
            return `«${hit.host}» ${t("pretends to be Discord or Steam, but this is not their real address.")}`;
    }
}

const box: React.CSSProperties = {
    marginTop: 4,
    padding: "8px 12px",
    borderRadius: 8,
    borderLeft: "3px solid var(--status-danger, #f23f42)",
    background: "color-mix(in srgb, var(--status-danger, #f23f42) 12%, var(--background-secondary, transparent))",
    fontSize: 14,
    lineHeight: 1.4
};

function ScamWarning({ hits }: { hits: ScamHit[]; }) {
    return (
        <div style={box}>
            <div style={{ fontWeight: 600, color: "var(--status-danger, #f23f42)" }}>
                ⚠️ {t("Careful with this link")}
            </div>
            <ul style={{ margin: "4px 0 0 18px", listStyle: "disc" }}>
                {hits.map(h => <li key={h.host} style={{ marginBottom: 2 }}>{describe(h)}</li>)}
            </ul>
            <div style={{ marginTop: 4, opacity: 0.85 }}>
                {t("Do not enter your login, password or card details there. There is no free Nitro from links like this — this is how accounts are stolen.")}
            </div>
        </div>
    );
}

export default definePlugin({
    name: "ScamLinkGuard",
    description: "Warns you when a link in a message imitates Discord or Steam — the fake \"free Nitro\" and gift sites that steal accounts",
    tags: ["Privacy", "Chat"],
    authors: [Devs.Nightcord],
    dependencies: ["MessageAccessoriesAPI"],
    enabledByDefault: true,

    // exposed for the tests
    scanForScams,

    renderMessageAccessory(props) {
        const hits = scanForScams(textOf(props.message as Message));
        return hits.length ? <ScamWarning hits={hits} /> : null;
    }
});
