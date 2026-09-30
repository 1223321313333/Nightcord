/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { isPluginEnabled, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { clearLogs } from "@equicordplugins/messageLoggerEnhanced";
import { DB_NAME as MLE_DB_NAME } from "@equicordplugins/messageLoggerEnhanced/utils/constants";
import { t } from "@utils/i18n";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { filters, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { Alerts, Button, Checkbox, React, showToast, Toasts, useEffect, UserSettingsActionCreators, UserStore, useState, useStateFromStores } from "@webpack/common";

const logger = new Logger("PrivacyCheckup");

const ConsentStore = findStoreLazy("ConsentStore");
const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const ConsentActions: {
    fetchConsents(): Promise<unknown>;
    setConsents(grant: string[], revoke: string[]): Promise<unknown>;
} = mapMangledModuleLazy('type:"UPDATE_CONSENTS"', {
    fetchConsents: filters.byCode(".get({"),
    setConsents: filters.byCode(".post({")
});

interface ProtoSource {
    kind: "proto";
    group: "privacy" | "status";
    field: string;
    /** The private value, unless check/fix are given */
    privateValue?: boolean | number;
    /** Used when the field has never been set: whether Discord stores it as { value } */
    wrapped: boolean;
    /** Discord's value when the field has never been set */
    unset?: boolean | number;
    check?(value: any): boolean;
    fix?(value: any): boolean | number;
}

/** Where a setting lives in Discord and which value keeps it private */
type Source =
    | { kind: "consent"; type: string; }
    | ProtoSource
    /** Only shown, Nightcord cannot change it */
    | { kind: "info"; isFine(): boolean | undefined; };

// Discord's friend request sources
const FRIEND_REQUESTS_FROM_EVERYONE = 8;

interface Item {
    id: string;
    title: string;
    description: string;
    source: Source;
    /** Changing it turns off something people use on purpose, so it is not ticked by default */
    optional?: string;
}

const ITEMS: Item[] = [
    {
        id: "usage",
        title: "Use my data to improve Discord",
        description: "Discord keeps and analyses how you use the app.",
        source: { kind: "consent", type: "usage_statistics" }
    },
    {
        id: "personalization",
        title: "Use my data to personalise my Discord experience",
        description: "Discord builds a profile of you for recommendations and offers.",
        source: { kind: "consent", type: "personalization" }
    },
    {
        id: "platforms",
        title: "Detect accounts of other platforms on this computer",
        description: "Discord looks for other apps you are logged into and suggests connecting them.",
        source: { kind: "proto", group: "privacy", field: "detectPlatformAccounts", privateValue: false, wrapped: true }
    },
    {
        id: "screenReader",
        title: "Let Discord detect screen reader use",
        description: "Discord records whether you use a screen reader.",
        source: { kind: "proto", group: "privacy", field: "allowAccessibilityDetection", privateValue: false, wrapped: false }
    },
    {
        id: "contacts",
        title: "Sync phone contacts",
        description: "Your phone's contacts are uploaded to find friends.",
        source: { kind: "proto", group: "privacy", field: "contactSyncEnabled", privateValue: false, wrapped: true }
    },
    {
        id: "discovery",
        title: "Let people find me by phone number or email",
        description: "Anyone with your number or email can find your account.",
        source: { kind: "proto", group: "privacy", field: "friendDiscoveryFlags", privateValue: 0, wrapped: true }
    },
    {
        id: "game",
        title: "Show what I am playing",
        description: "Friends and server members see your current game.",
        source: { kind: "proto", group: "status", field: "showCurrentGame", privateValue: false, wrapped: true },
        optional: "friends will not see your game"
    },
    {
        id: "quests",
        title: "Quests and game tracking for rewards",
        description: "Discord tracks your gaming activity for Quests.",
        source: { kind: "proto", group: "privacy", field: "dropsOptedOut", privateValue: true, wrapped: true },
        optional: "Quests will stop working"
    },
    {
        id: "friendRequests",
        title: "Anyone can send me friend requests",
        description: "Strangers can add you. Turned off, only friends of friends and people from your servers can.",
        source: {
            kind: "proto", group: "privacy", field: "friendSourceFlags", wrapped: true, unset: 14,
            check: flags => (flags & FRIEND_REQUESTS_FROM_EVERYONE) === 0,
            fix: flags => flags & ~FRIEND_REQUESTS_FROM_EVERYONE
        },
        optional: "strangers will not be able to add you"
    },
    {
        id: "serverDms",
        title: "Direct messages from members of new servers",
        description: "Anyone in a server you join can message you.",
        source: { kind: "proto", group: "privacy", field: "defaultGuildsRestricted", privateValue: true, wrapped: false, unset: false },
        optional: "people from servers you join next will need to be your friends to message you"
    },
    {
        id: "mfa",
        title: "Two-factor authentication",
        description: "Off: a stolen password is enough to take over your account. Turn it on in Discord → My Account.",
        source: { kind: "info", isFine: () => UserStore.getCurrentUser()?.mfaEnabled }
    }
];

const unwrap = (raw: unknown) => raw != null && typeof raw === "object" ? (raw as { value: unknown; }).value : raw;

/** true: private, false: collects or shows data, "loading": not known yet, null: not available in this Discord version */
function isPrivate(item: Item): boolean | null | "loading" {
    const { source } = item;
    if (source.kind === "info") return source.isFine() ?? null;
    if (source.kind === "consent") {
        return ConsentStore.fetchedConsents ? !ConsentStore.hasConsented(source.type) : "loading";
    }

    const group = UserSettingsProtoStore.settings?.[source.group];
    if (group == null) return null;
    const value = unwrap(group[source.field]) ?? source.unset;
    if (value === undefined) return null;
    return source.check ? source.check(value) : value === source.privateValue;
}

async function applyPrivate(items: Item[]) {
    const revoke = items.flatMap(i => i.source.kind === "consent" ? [i.source.type] : []);
    if (revoke.length) await ConsentActions.setConsents([], revoke);

    for (const group of ["privacy", "status"] as const) {
        const fields = items.flatMap(i => i.source.kind === "proto" && i.source.group === group ? [i.source] : []);
        if (!fields.length) continue;
        await UserSettingsActionCreators.PreloadedUserSettingsActionCreators.updateAsync(group, (draft: any) => {
            for (const f of fields) {
                const current = draft[f.field];
                const value = f.fix ? f.fix(unwrap(current) ?? f.unset) : f.privateValue;
                // keep the shape Discord uses for the field: a { value } wrapper or a plain value
                const wrapped = current != null ? typeof current === "object" : f.wrapped;
                draft[f.field] = wrapped ? { value } : value;
            }
        }, 0);
    }
}

/** What Nightcord keeps on this computer, and how to remove it */
const LOCAL_TRACES: { what: string; wipe(): Promise<unknown>; }[] = [
    { what: "Bookmarks", wipe: () => DataStore.del("Nightcord_Bookmarks") },
    { what: "Channel and server notes", wipe: () => DataStore.del("Nightcord_ChannelNotes") },
    { what: "Notification log", wipe: () => DataStore.set("notification-log", []) },
    {
        what: "Deleted and edited messages saved by MessageLoggerEnhanced, with their pictures",
        wipe: async () => {
            if (isPluginEnabled("MessageLoggerEnhanced")) await clearLogs(false);
            else await new Promise(resolve => { const req = indexedDB.deleteDatabase(MLE_DB_NAME); req.onsuccess = req.onerror = req.onblocked = resolve; });
            await DataStore.clear(DataStore.createStore("MessageLoggerImageData", "MessageLoggerImageStore"));
        }
    },
    // MessageLogger only keeps its log in memory; the reload after wiping clears it
    { what: "Deleted and edited messages shown by MessageLogger (cleared by the restart)", wipe: async () => { } }
];

function confirmWipe() {
    Alerts.show({
        title: t("Erase Nightcord data on this computer?"),
        body: (
            <>
                <Paragraph>{t("This deletes, without a way back:")}</Paragraph>
                <ul style={{ margin: "8px 0 8px 18px", listStyle: "disc" }}>
                    {LOCAL_TRACES.map(x => <li key={x.what}><Paragraph size="sm">{t(x.what)}</Paragraph></li>)}
                </ul>
                <Paragraph>{t("Settings, themes and your Discord account are not touched. Discord restarts afterwards.")}</Paragraph>
            </>
        ),
        confirmText: t("Erase"),
        confirmColor: "danger",
        cancelText: t("Cancel"),
        async onConfirm() {
            for (const trace of LOCAL_TRACES) {
                try {
                    await trace.wipe();
                } catch (err) {
                    logger.error(`Could not erase: ${trace.what}`, err);
                }
            }
            location.reload();
        }
    });
}

export function LocalTraces() {
    return (
        <section className={Margins.top20}>
            <Heading>{t("Traces on this computer")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Nightcord keeps bookmarks, notes, the notification log and saved deleted messages on this computer. Anyone with access to it could read them.")}
            </Paragraph>
            <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={confirmWipe}>
                {t("Erase Nightcord data…")}
            </Button>
        </section>
    );
}

const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
    background: "var(--background-surface-high, var(--background-secondary))"
};
const titleStyle: React.CSSProperties = { fontWeight: 600, color: "var(--text-strong, var(--header-primary))" };
// Discord's Checkbox grows to fill the row and squeezes the text next to it
export const checkboxStyle: React.CSSProperties = { flex: "none" };

export function PrivacyCheckup() {
    const states = useStateFromStores([ConsentStore, UserSettingsProtoStore], () => ITEMS.map(isPrivate));

    // Discord only loads consents when its own privacy page is opened; ask for them so the answer is real
    useEffect(() => {
        if (!ConsentStore.fetchedConsents) ConsentActions.fetchConsents().catch(err => logger.warn("Could not load consents", err));
    }, []);
    const [chosen, setChosen] = useState<Record<string, boolean>>({});
    const [busy, setBusy] = useState(false);

    const exposed = ITEMS.filter((item, i) => states[i] === false && item.source.kind !== "info");
    const isChosen = (item: Item) => chosen[item.id] ?? !item.optional;
    const toApply = exposed.filter(isChosen);

    const guard = useSettings(["plugins.PrivacyGuard.enabled"]).plugins.PrivacyGuard?.enabled ?? false;
    function setGuard(on: boolean) {
        Settings.plugins.PrivacyGuard.enabled = on;
        if (on) startPlugin(plugins.PrivacyGuard);
        else stopPlugin(plugins.PrivacyGuard);
    }

    async function apply() {
        setBusy(true);
        try {
            await applyPrivate(toApply);
            setChosen({});
            showToast(t("Privacy settings updated"), Toasts.Type.SUCCESS);
        } catch (err) {
            logger.error("Failed to update privacy settings", err);
            showToast(t("Discord did not accept the change, try again later"), Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className={Margins.top20}>
            <Heading>{t("Account privacy checkup")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("These settings are stored in your Discord account and control what Discord collects about you and what others can see. Nightcord only changes them when you press Apply or turn on watching below.")}
            </Paragraph>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ITEMS.map((item, i) => {
                    const state = states[i];
                    if (state === null) return null;
                    if (state === "loading") {
                        return (
                            <div key={item.id} style={rowStyle}>
                                <span style={{ fontSize: 18 }}>⏳</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={titleStyle}>{t(item.title)}</div>
                                    <Paragraph size="sm">{t("Checking with Discord…")}</Paragraph>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div key={item.id} style={rowStyle}>
                            <span style={{ fontSize: 18 }}>{state ? "✅" : "⚠️"}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={titleStyle}>{t(item.title)}</div>
                                <Paragraph size="sm">
                                    {state ? t(item.source.kind === "info" ? "On." : "Off, nothing to do.") : t(item.description)}
                                    {!state && item.optional ? ` ${t("Turning it off")}: ${t(item.optional)}.` : ""}
                                </Paragraph>
                            </div>
                            {!state && item.source.kind !== "info" && (
                                <div style={checkboxStyle}>
                                    <Checkbox
                                        value={isChosen(item)}
                                        onChange={(_: unknown, value: boolean) => setChosen(c => ({ ...c, [item.id]: value }))}
                                        disabled={busy}
                                    >
                                        <Paragraph size="sm">{t("Turn off")}</Paragraph>
                                    </Checkbox>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <Button size={Button.Sizes.SMALL} disabled={busy || !toApply.length} onClick={apply}>
                    {toApply.length ? `${t("Apply")} (${toApply.length})` : t("Apply")}
                </Button>
                <Paragraph size="sm">
                    {exposed.length ? t("You can switch any of these back in Discord's settings (Data & Privacy).") : t("Everything here is already private.")}
                </Paragraph>
            </div>
            <div style={{ ...rowStyle, marginTop: 12 }}>
                <span style={{ fontSize: 18 }}>🛡️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={titleStyle}>{t("Keep data use off")}</div>
                    <Paragraph size="sm">{t("Discord turns data use for improving Discord and personalisation back on (from the phone app, prompts or new features). With this on, Nightcord switches them off again and tells you.")}</Paragraph>
                </div>
                <div style={checkboxStyle}>
                    <Checkbox value={guard} onChange={(_: unknown, value: boolean) => setGuard(value)}>
                        <Paragraph size="sm">{t("Watch")}</Paragraph>
                    </Checkbox>
                </div>
            </div>
        </section>
    );
}
