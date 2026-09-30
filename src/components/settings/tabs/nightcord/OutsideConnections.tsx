/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { getOutsideHosts, subscribeOutsideHosts } from "@utils/networkLog";
import { Checkbox, React, useEffect, useState } from "@webpack/common";

import { checkboxStyle } from "./PrivacyCheckup";

/** Hosts whose purpose is known, so the list can say why they were contacted */
const KNOWN_HOSTS: [RegExp, string][] = [
    [/^raw\.githubusercontent\.com$/, "GitHub: link cleaning rules for ClearURLs and the list of Nightcord badges"],
    [/(^|\.)github(usercontent)?\.com$/, "GitHub: Nightcord updates"],
    [/^(badges\.vencord\.dev|badge\.equicord\.org)$/, "Vencord and Equicord donor badges"],
    [/^fonts\.(googleapis|gstatic)\.com$/, "Google Fonts: the font chosen in the Nightcord theme"],
    [/(^|\.)(youtube(-nocookie)?\.com|ytimg\.com|googlevideo\.com)$/, "YouTube: a video played in the chat"],
    [/(^|\.)tenor\.com$/, "Tenor: GIFs"],
    [/(^|\.)(spotify\.com|scdn\.co)$/, "Spotify: a player in the chat"],
    [/(^|\.)hcaptcha\.com$/, "hCaptcha: Discord's captcha"],
    [/(^|\.)(stripe\.com|stripe\.network)$/, "Stripe: Discord's payments"]
];

const KIND_NAMES: Record<string, string> = {
    img: "pictures",
    image: "pictures",
    fetch: "data",
    xmlhttprequest: "data",
    beacon: "data",
    css: "styles and fonts",
    link: "styles and fonts",
    script: "scripts",
    iframe: "embedded page",
    video: "video",
    audio: "audio"
};

const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
    background: "var(--background-surface-high, var(--background-secondary))"
};
const titleStyle: React.CSSProperties = { fontWeight: 600, color: "var(--text-strong, var(--header-primary))", overflowWrap: "anywhere" };

function explain(host: string) {
    return KNOWN_HOSTS.find(([re]) => re.test(host))?.[1];
}

export function OutsideConnections() {
    const [hosts, setHosts] = useState(getOutsideHosts);
    useEffect(() => subscribeOutsideHosts(() => setHosts(getOutsideHosts())), []);

    const donorBadges = useSettings(["plugins.BadgeAPI.donorBadges"]).plugins.BadgeAPI?.donorBadges ?? false;

    return (
        <section className={Margins.top20}>
            <Heading>{t("Connections outside Discord")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Servers other than Discord's that this window has contacted since Discord started. Pictures and links from messages are loaded through Discord's own servers, so they are not listed.")}
            </Paragraph>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={rowStyle}>
                    <span style={{ fontSize: 18 }}>🔄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={titleStyle}>api.github.com</div>
                        <Paragraph size="sm">{t("Nightcord checks GitHub for updates when Discord starts. This runs outside the window, so it is not counted below.")}</Paragraph>
                    </div>
                </div>
                <div style={rowStyle}>
                    <span style={{ fontSize: 18 }}>🎖️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={titleStyle}>{t("Vencord and Equicord donor badges")}</div>
                        <Paragraph size="sm">{t("Downloads two lists from badges.vencord.dev and badge.equicord.org every 30 minutes. Those servers see your IP address and that you use a Discord mod.")}</Paragraph>
                    </div>
                    <div style={checkboxStyle}>
                        <Checkbox value={donorBadges} onChange={(_: unknown, value: boolean) => { Settings.plugins.BadgeAPI.donorBadges = value; }}>
                            <Paragraph size="sm">{t("Load")}</Paragraph>
                        </Checkbox>
                    </div>
                </div>
                {hosts.length === 0 && (
                    <div style={rowStyle}>
                        <span style={{ fontSize: 18 }}>✅</span>
                        <Paragraph size="sm">{t("Nothing yet: since the start this window has only talked to Discord.")}</Paragraph>
                    </div>
                )}
                {hosts.map(h => {
                    const why = explain(h.host);
                    const kinds = [...new Set([...h.kinds].map(k => t(KIND_NAMES[k] ?? "other")))].join(", ");
                    return (
                        <div key={h.host} style={rowStyle}>
                            <span style={{ fontSize: 18 }}>{why ? "🌐" : "❔"}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={titleStyle}>{h.host} <span style={{ fontWeight: 400, opacity: 0.7 }}>×{h.count}</span></div>
                                <Paragraph size="sm">
                                    {why ? t(why) : t("Not recognised: a plugin, a theme or something embedded in the chat.")} ({kinds})
                                </Paragraph>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
