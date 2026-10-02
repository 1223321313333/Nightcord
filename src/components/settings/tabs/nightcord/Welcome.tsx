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

const openPanel = (onClose: () => void, panel: string) => { onClose(); SettingsRouter.openUserSettings(panel); };

function PrivacyStep() {
    const points = [
        t("The window can only reach Discord and the servers Nightcord needs — nothing can quietly send your data elsewhere."),
        t("Location and camera details are stripped from the photos and videos you send."),
        t("Discord's own tracking and crash reports are blocked."),
        t("Tracking tags (utm, fbclid and the like) are cleaned from links you send and open."),
        t("Links in messages that imitate Discord or Steam are flagged, so fake \"free Nitro\" sites cannot catch you.")
    ];
    return (
        <>
            <Paragraph className={Margins.bottom8}>{t("The important things are on from the start. You do not have to do anything here.")}</Paragraph>
            <ul style={{ margin: "0 0 0 18px", listStyle: "disc" }}>
                {points.map(p => <li key={p} style={{ marginBottom: 6 }}><Paragraph size="sm">{p}</Paragraph></li>)}
            </ul>
        </>
    );
}

function PresetStep() {
    const presets = PRESETS.filter(p => p.id !== "defaults");
    return (
        <>
            <Paragraph className={Margins.bottom8}>{t("Turn on a ready-made set of plugins in one click. You will see exactly what changes before anything happens, and can change it later in the Plugins tab.")}</Paragraph>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {presets.map(p => (
                    <div key={p.id} style={cardStyle}>
                        <div style={strong}>{p.emoji} {t(p.title)}</div>
                        <Paragraph size="sm" style={{ flex: 1 }}>{t(p.description)}</Paragraph>
                        <Button size={Button.Sizes.SMALL} onClick={() => confirmPreset(p)}>{t("Apply")}</Button>
                    </div>
                ))}
            </div>
        </>
    );
}

function FinishStep({ onClose }: { onClose: () => void; }) {
    const tips: { emoji: string; title: string; text: string; panel?: string; }[] = [
        { emoji: "🔒", title: t("Encrypted direct messages"), text: t("In a direct message, the lock button turns on encryption that only you and the other person can read. Both of you need Nightcord.") },
        { emoji: "💾", title: t("Backup to your own Discord"), text: t("Keep an encrypted copy of your settings in a channel of your own server, and turn on a weekly automatic copy."), panel: "nightcord_backup_restore_panel" },
        { emoji: "🛡️", title: t("Account privacy checkup"), text: t("See what Discord collects about you and turn it off in one click."), panel: "nightcord_main_panel" }
    ];
    return (
        <>
            <Paragraph className={Margins.bottom8}>{t("That's it. Everything can be changed later in the Nightcord settings. A few more things worth knowing:")}</Paragraph>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tips.map(tip => (
                    <div key={tip.title} style={{ ...cardStyle, flexDirection: "row", alignItems: "center" }}>
                        <span style={{ fontSize: 18 }}>{tip.emoji}</span>
                        <div style={{ flex: 1 }}>
                            <div style={strong}>{tip.title}</div>
                            <Paragraph size="sm">{tip.text}</Paragraph>
                        </div>
                        {tip.panel && (
                            <Button size={Button.Sizes.SMALL} onClick={() => openPanel(onClose, tip.panel!)}>{t("Open")}</Button>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}

function WelcomeModal(props: RenderModalProps) {
    const [step, setStep] = React.useState(0);
    const settings = useSettings(["betaUpdates"]);

    const steps = [
        { title: `🌙 ${t("Welcome to Nightcord")}`, body: <Paragraph>{t("Nightcord is already working. This quick setup takes a minute, and you can change everything later in the Nightcord settings.")}</Paragraph> },
        { title: `🛡️ ${t("Your privacy is already on")}`, body: <PrivacyStep /> },
        { title: `😎 ${t("Pick a set to start with")}`, body: <PresetStep /> },
        { title: `✅ ${t("Almost done")}`, body: <FinishStep onClose={props.onClose} /> }
    ];
    const last = step === steps.length - 1;

    const actions = [
        ...(step > 0 ? [{ text: t("Back"), variant: "secondary" as const, onClick: () => setStep(step - 1) }] : []),
        { text: last ? t("Done") : t("Next"), variant: "primary" as const, onClick: () => last ? props.onClose() : setStep(step + 1) }
    ];

    return (
        <Modal
            {...props}
            size="md"
            title={steps[step].title}
            subtitle={`${t("Step")} ${step + 1} / ${steps.length}`}
            actions={actions}
            actionBarInput={last
                ? (
                    <Checkbox value={settings.betaUpdates} onChange={(_: unknown, v: boolean) => { Settings.betaUpdates = v; }}>
                        <Paragraph size="sm">{t("Get new versions right away (beta), not a day later")}</Paragraph>
                    </Checkbox>
                )
                : undefined}
        >
            {steps[step].body}
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
