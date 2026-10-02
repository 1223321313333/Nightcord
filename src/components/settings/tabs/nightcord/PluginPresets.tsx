/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, pluginRequiresRestart, plugins, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { Button, ConfirmModal, openModal, React, showToast, Toasts } from "@webpack/common";

import { SENDS_DATA, VISIBLE_TO_OTHERS } from "../plugins/curation";

export interface Preset {
    id: string;
    emoji: string;
    title: string;
    description: string;
    enable: () => string[];
    disable: () => string[];
    /** Also turn off other themes so the lightweight Nightcord theme applies */
    disableThemes?: boolean;
    /** Plugin settings to set, as { PluginName: { settingKey: value } } */
    settings?: Record<string, Record<string, unknown>>;
    /** Turn on strict connections (see OutsideConnections) */
    strictConnections?: boolean;
    /** Shown in the confirmation, for presets whose effect is not obvious from plugin names */
    note?: string;
}

const HEAVY_PLUGINS = [
    "MessageLogger", "MessageLoggerEnhanced", "PlatformIndicators", "MemberCount", "ReviewDB", "Decor", "USRBG",
    "UserPFP", "BannersEverywhere", "BetterActivities", "GlobalBadges", "ShowBadgesInChat", "MentionAvatars",
    "TypingTweaks", "RoleColorEverywhere", "ShikiCodeblocks", "WhoReacted", "AlwaysAnimate", "Snowfall",
    "CursorBuddy", "PartyMode", "NightSchedule", "ClientTheme", "FriendshipRanks", "Streaks", "VoiceStats",
    "Timezones", "ShowRolesInChat", "IrcColors", "MessageColors", "MessageLinkEmbeds", "BetterAudioPlayer"
];

export const PRESETS: Preset[] = [
    {
        id: "friends",
        emoji: "😎",
        title: "Like my friends",
        description: "The popular set: emoji and stickers without Nitro, deleted messages, hidden channels, silent typing and handy tweaks.",
        enable: () => [
            "FakeNitro", "MessageLogger", "ShowHiddenChannels", "SilentTyping", "PlatformIndicators", "ViewIcons",
            "CallTimer", "MemberCount", "ClearURLs", "ReverseImageSearch", "Translate", "ImageZoom", "TypingIndicator",
            "WhoReacted", "FavoriteEmojiFirst", "VolumeBooster", "GameActivityToggle", "RevealAllSpoilers",
            "PermissionsViewer", "ServerInfo", "ValidUser", "ValidReply", "MessageLinkEmbeds",
            "CopyUserURLs", "NoOnboardingDelay"
        ],
        disable: () => []
    },
    {
        id: "privacy",
        emoji: "🕵️",
        title: "Maximum privacy",
        description: "Removes GPS and camera data from photos and videos, strips trackers from links, anonymises file names, hides that you are typing, and turns off plugins that send data to other servers or show others that you use a mod.",
        enable: () => ["StripMetadata", "ClearURLs", "CleanOpenedLinks", "PrivacyGuard", "AnonymiseFileNames", "SilentTyping", "NoRPC", "StreamerModeOn", "NoReplyMention"],
        disable: () => [
            ...Object.entries(SENDS_DATA).filter(([, d]) => d.automatic).map(([name]) => name),
            ...Object.keys(VISIBLE_TO_OTHERS)
        ],
        settings: {
            BadgeAPI: { donorBadges: false }
        },
        strictConnections: true,
        note: "Discord's own analytics and crash reports are always blocked by Nightcord (NoTrack), with or without this preset."
    },
    {
        id: "speed",
        emoji: "⚡",
        title: "Maximum speed",
        description: "Turns off plugins that add work to every message or member, and swaps heavy themes for the lightweight Nightcord theme.",
        enable: () => ["NoTypingAnimation", "Nightcord"],
        disable: () => HEAVY_PLUGINS,
        disableThemes: true
    },
    {
        id: "bigfiles",
        emoji: "📦",
        title: "Big files without Nitro",
        description: "Files over Discord's upload limit are uploaded to Litterbox (up to 1 GB, kept for 72 hours) and the link is put in your message. Smaller files still go to Discord.",
        enable: () => ["FileUpload"],
        disable: () => [],
        settings: {
            FileUpload: {
                serviceType: "litterbox",
                litterboxExpiry: "72h",
                bypassDiscordUpload: true,
                bypassDiscordUploadOnlyOverLimit: true,
                autoSend: true
            }
        },
        note: "Only files over the limit leave Discord. They go to litterbox.catbox.moe, a free public file host: anyone with the link can open the file until it expires after 72 hours. Do not send private files this way."
    },
    {
        id: "nonitro",
        emoji: "🎁",
        title: "Everything without Nitro",
        description: "Custom and animated emoji, stickers and reactions, profile colours and a profile banner, higher stream quality and no Nitro ads — all without paying for Nitro.",
        enable: () => ["FakeNitro", "FakeProfileThemes", "SuperReactionTweaks", "AlwaysAnimate", "ExpressionCloner", "NoNitroUpsell", "USRBG"],
        disable: () => [],
        note: "The profile banner (USRBG) is shown to other people and is loaded from the USRBG community server. Everything else works just for you."
    },
    {
        id: "looks",
        emoji: "🎨",
        title: "Nicer look",
        description: "A custom accent colour for the whole app, your own colour for any person, avatars in mentions, role colours everywhere, custom avatar decorations and nicer typing indicators. Ready-made themes are in the Themes tab.",
        enable: () => ["ClientTheme", "CustomUserColors", "MentionAvatars", "RoleColorEverywhere", "TypingTweaks", "Decor"],
        disable: () => [],
        note: "Avatar decorations (Decor) are visible to other people and are loaded from the Decor community server."
    },
    {
        id: "voice",
        emoji: "🎧",
        title: "Voice and streaming",
        description: "Unlock screen-share resolution and FPS, remove the bitrate cap, make other people louder, enlarge stream previews, join voice with a double-click, download voice messages and turn them into text right on your computer.",
        enable: () => ["LimitlessScreenshare", "WebScreenShareFixes", "VolumeBooster", "BiggerStreamPreview", "VoiceChatDoubleClick", "VoiceDownload", "VoiceMessageTranscriber", "PictureInPicture"],
        disable: () => [],
        note: "Voice-message transcription runs on your own computer (Whisper) and downloads a small model the first time."
    },
    {
        id: "fun",
        emoji: "🎉",
        title: "Fun in chat",
        description: "Fun slash commands, wiggly text, mention a random member, the moai sound, tone tags, confetti on pings and a little pet that follows your cursor.",
        enable: () => ["MoreCommands", "WigglyText", "AtSomeone", "Moyai", "ToneIndicators", "PartyMode", "CursorBuddy"],
        disable: () => [],
        note: "Confetti (PartyMode) and the cursor pet are purely for fun and can use a little more CPU."
    },
    {
        id: "defaults",
        emoji: "↩️",
        title: "Nightcord defaults",
        description: "Back to how Nightcord is set up after installing: the default plugins on, everything else off.",
        enable: () => Object.values(plugins).filter(p => p.enabledByDefault).map(p => p.name),
        disable: () => Object.values(plugins)
            .filter(p => !p.required && !p.enabledByDefault && !p.name.endsWith("API") && isPluginEnabled(p.name))
            .map(p => p.name)
    }
];

function planFor(preset: Preset) {
    const exists = (n: string) => n in plugins && !plugins[n].required;
    const toEnable = preset.enable().filter(n => exists(n) && !isPluginEnabled(n));
    const toDisable = preset.disable().filter(n => exists(n) && isPluginEnabled(n) && !toEnable.includes(n));
    const themes = preset.disableThemes ? [...Settings.enabledThemes, ...Settings.themeLinks.filter(Boolean)] : [];
    const settingChanges = Object.entries(preset.settings ?? {})
        .filter(([plugin]) => plugin in plugins)
        .flatMap(([plugin, values]) => Object.entries(values)
            .filter(([key, value]) => Settings.plugins[plugin]?.[key] !== value)
            .map(([key, value]) => ({ plugin, key, value })));
    const strict = !!preset.strictConnections && !Settings.strictConnections;
    return { toEnable, toDisable, themes, settingChanges, strict, note: preset.note };
}

function applyPlan({ toEnable, toDisable, themes, settingChanges, strict }: ReturnType<typeof planFor>) {
    // strict connections apply when the page loads
    let restartNeeded = strict;
    if (strict) Settings.strictConnections = true;
    const failed: string[] = [];

    // Settings first, so plugins that start below already see them
    for (const { plugin, key, value } of settingChanges) {
        Settings.plugins[plugin][key] = value;
    }

    for (const name of toDisable) {
        const plugin = plugins[name];
        if (pluginRequiresRestart(plugin)) restartNeeded = true;
        else if (plugin.started && !stopPlugin(plugin)) failed.push(name);
        Settings.plugins[name].enabled = false;
    }

    for (const name of toEnable) {
        const plugin = plugins[name];
        const deps = startDependenciesRecursive(plugin);
        if (deps.failures.length) {
            failed.push(name);
            continue;
        }
        Settings.plugins[name].enabled = true;
        if (deps.restartNeeded || pluginRequiresRestart(plugin)) restartNeeded = true;
        else if (!plugin.started && !startPlugin(plugin)) failed.push(name);
    }

    if (themes.length) {
        Settings.enabledThemes = [];
        Settings.themeLinks = [];
    }

    return { restartNeeded, failed };
}

export function confirmPreset(preset: Preset) {
    const plan = planFor(preset);
    const nothing = !plan.toEnable.length && !plan.toDisable.length && !plan.themes.length && !plan.settingChanges.length && !plan.strict;
    if (nothing) {
        showToast(t("Everything from this preset is already set up."), Toasts.Type.MESSAGE);
        return;
    }

    openModal(props => (
        <ConfirmModal
            {...props}
            title={`${preset.emoji} ${t(preset.title)}`}
            confirmText={t("Apply")}
            cancelText={t("Cancel")}
            variant="primary"
            onConfirm={() => {
                const { restartNeeded, failed } = applyPlan(plan);
                if (failed.length) showToast(`${t("Could not change")}: ${failed.join(", ")}`, Toasts.Type.FAILURE);
                else showToast(t("Preset applied!"), Toasts.Type.SUCCESS);
                if (restartNeeded) askRestart();
            }}
        >
            {!!plan.toEnable.length && (
                <Paragraph className={Margins.bottom8}>
                    <b>{t("Will turn on")} ({plan.toEnable.length}):</b> {plan.toEnable.join(", ")}
                </Paragraph>
            )}
            {!!plan.toDisable.length && (
                <Paragraph className={Margins.bottom8}>
                    <b>{t("Will turn off")} ({plan.toDisable.length}):</b> {plan.toDisable.join(", ")}
                </Paragraph>
            )}
            {!!plan.themes.length && (
                <Paragraph className={Margins.bottom8}>
                    <b>{t("Will turn off themes")}:</b> {plan.themes.join(", ")}
                </Paragraph>
            )}
            {!!plan.settingChanges.length && (
                <Paragraph className={Margins.bottom8}>
                    <b>{t("Will change settings")}:</b> {plan.settingChanges.map(c => `${c.plugin} → ${c.key} = ${String(c.value)}`).join(", ")}
                </Paragraph>
            )}
            {plan.strict && (
                <Paragraph className={Margins.bottom8}>
                    <b>{t("Will turn on")}:</b> {t("Strict connections")}
                </Paragraph>
            )}
            {plan.note && (
                <Paragraph className={Margins.bottom8}>⚠️ {t(plan.note)}</Paragraph>
            )}
            <Paragraph>{t("You can change any of this later in the Plugins tab.")}</Paragraph>
        </ConfirmModal>
    ));
}

function askRestart() {
    openModal(props => (
        <ConfirmModal
            {...props}
            title={t("Restart Required")}
            confirmText={t("Restart now")}
            cancelText={t("Later!")}
            variant="primary"
            onConfirm={relaunch}
        >
            <Paragraph>{t("Some of these plugins change Discord's code and start after a restart.")}</Paragraph>
        </ConfirmModal>
    ));
}

export function PluginPresets() {
    return (
        <section className={Margins.top20}>
            <Heading>{t("Plugin presets")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Set up many plugins in one click. You will see exactly what changes before anything happens.")}
            </Paragraph>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {PRESETS.map(p => (
                    <div
                        key={p.id}
                        style={{
                            display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 12,
                            background: "var(--background-surface-high, var(--background-secondary))",
                            border: "1px solid var(--border-subtle, transparent)"
                        }}
                    >
                        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-strong, var(--header-primary))" }}>
                            {p.emoji} {t(p.title)}
                        </div>
                        <Paragraph style={{ flex: 1 }}>{t(p.description)}</Paragraph>
                        <Button size={Button.Sizes.SMALL} onClick={() => confirmPreset(p)}>
                            {t("Apply")}
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    );
}
