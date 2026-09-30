/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Settings, useSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { RenderModalProps } from "@nightcord/discord-types";
import { CHANGELOG_RU, ChangelogEntry } from "@utils/changelogRu";
import { t } from "@utils/i18n";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { STARTUP } from "@utils/safeMode";
import { Button, Checkbox, Modal, openModal, React, SettingsRouter, UserStore } from "@webpack/common";

import { confirmPreset, PRESETS } from "./PluginPresets";

const LAST_SEEN_KEY = "Nightcord_LastSeenChangelog";
const logger = new Logger("Welcome");

const cardStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 6, padding: 12, borderRadius: 10,
    background: "var(--background-surface-high, var(--background-secondary))",
    border: "1px solid var(--border-subtle, transparent)"
};
const strong: React.CSSProperties = { fontWeight: 600, color: "var(--text-strong, var(--header-primary))" };

function WelcomeModal(props: RenderModalProps) {
    const settings = useSettings(["betaUpdates"]);
    const presets = PRESETS.filter(p => p.id !== "defaults");

    return (
        <Modal
            {...props}
            size="md"
            title={`🌙 ${t("Welcome to Nightcord")}`}
            subtitle={t("Nightcord already works. Pick where to start, you can change everything later in the Nightcord settings.")}
            actions={[{ text: t("Done"), variant: "primary", onClick: props.onClose }]}
        >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {presets.map(p => (
                    <div key={p.id} style={cardStyle}>
                        <div style={strong}>{p.emoji} {t(p.title)}</div>
                        <Paragraph size="sm" style={{ flex: 1 }}>{t(p.description)}</Paragraph>
                        <Button size={Button.Sizes.SMALL} onClick={() => confirmPreset(p)}>{t("Apply")}</Button>
                    </div>
                ))}
            </div>
            <div style={{ ...cardStyle, flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 18 }}>🛡️</span>
                <div style={{ flex: 1 }}>
                    <div style={strong}>{t("Account privacy checkup")}</div>
                    <Paragraph size="sm">{t("See what Discord collects about you and turn it off in one click.")}</Paragraph>
                </div>
                <Button size={Button.Sizes.SMALL} onClick={() => { props.onClose(); SettingsRouter.openUserSettings("nightcord_main_panel"); }}>
                    {t("Open")}
                </Button>
            </div>
            <div className={Margins.top16}>
                <Checkbox value={settings.betaUpdates} onChange={(_: unknown, v: boolean) => { Settings.betaUpdates = v; }}>
                    <Paragraph size="sm">{t("Get new versions right away (beta), not a day later")}</Paragraph>
                </Checkbox>
            </div>
        </Modal>
    );
}

function WhatsNewModal({ entries, ...props }: RenderModalProps & { entries: ChangelogEntry[]; }) {
    return (
        <Modal
            {...props}
            size="md"
            title={`✨ ${t("What's new in Nightcord")}`}
            actions={[{ text: t("Great"), variant: "primary", onClick: props.onClose }]}
        >
            {entries.map(e => (
                <section key={e.id} className={Margins.bottom16}>
                    <div style={strong}>{e.title} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {e.date}</span></div>
                    <ul style={{ margin: "6px 0 0 18px", listStyle: "disc" }}>
                        {e.items.map(item => <li key={item} style={{ marginBottom: 4 }}><Paragraph size="sm">{item}</Paragraph></li>)}
                    </ul>
                </section>
            ))}
        </Modal>
    );
}

export function openWhatsNew(entries = CHANGELOG_RU.slice(0, 3)) {
    openModal(props => <WhatsNewModal {...props} entries={entries} />);
}

/**
 * After a fresh install: the welcome window. After an update: what changed since the last look.
 * Changelog entries are only in Russian, so they are shown only with the Russian interface.
 */
export async function showStartupModals() {
    if (STARTUP.safeMode) return;

    // on the login screen there is nothing to set up yet
    for (let i = 0; !UserStore.getCurrentUser(); i++) {
        if (i > 600) return;
        await new Promise(r => setTimeout(r, 2000));
    }
    await new Promise(r => setTimeout(r, 3000));

    try {
        const lastSeen = await DataStore.get<string>(LAST_SEEN_KEY);
        const newest = CHANGELOG_RU[0]?.id;
        if (newest) await DataStore.set(LAST_SEEN_KEY, newest);

        if (STARTUP.firstRun) {
            openModal(props => <WelcomeModal {...props} />);
            return;
        }

        if (!newest || lastSeen === newest || !Settings.plugins.RussianNightcord?.enabled) return;

        // Someone who used Nightcord before this list existed only gets the latest news, not the whole history
        const seenAt = CHANGELOG_RU.findIndex(e => e.id === lastSeen);
        const fresh = lastSeen == null ? CHANGELOG_RU.slice(0, 2) : CHANGELOG_RU.slice(0, seenAt === -1 ? 2 : seenAt);
        if (fresh.length) openWhatsNew(fresh);
    } catch (err) {
        logger.error("Could not show the welcome or what's new window", err);
    }
}
