/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Plugins, { PluginMeta } from "~plugins";

/**
 * Nightcord shows a curated set of plugins by default:
 *  - Vencord plugins (reviewed by the Vencord team) and Nightcord's own plugins
 *  - a hand-picked set of popular, stable Equicord plugins
 * Other Equicord plugins are "experimental" and developer tools get their own filter.
 */

/** Tools for plugin/theme developers */
export const DEV_TOOLS = new Set(["ConcatenatedModules", "ConsoleJanitor", "ConsoleShortcuts", "DevCompanion",
    "DiscordDevBanner", "ElementHighlighter", "Experiments", "F8Break", "IconViewer", "NoDevtoolsWarning",
    "ReactErrorDecoder", "StartupTimings", "ThemeAttributes", "ViewRaw", "WebpackTarball"
]);

/** Equicord plugins that are shown alongside the curated ones */
export const CURATED_EQUICORD = new Set([
    "AlwaysExpandProfiles", "BetterBlockedUsers", "BetterInvites", "BlockKeywords", "ChannelTabs", "ClientSideBlock",
    "CommandPalette", "CustomUserColors", "Declutter", "FavouriteAnything", "FileUpload", "FriendTags", "GlobalBadges",
    "HideServers", "IgnoreCalls", "InRole", "JumpTo", "LastActive", "MarkdownTables", "MessageLinkTooltip",
    "MessageLoggerEnhanced", "MessagePeek", "MessageTranslate", "MusicControls", "NeverPausePreviews", "NoNitroUpsell",
    "PinIcon", "Questify", "RecentDMSwitcher", "ReplyPingControl", "ScheduledMessages", "ServerSearch",
    "ShowBadgesInChat", "SilenceUsers", "SplitLargeMessages", "StatusPresets", "StickerBlocker", "Timezones",
    "ToastNotifications", "UnreadCountBadge", "VCPanelSettings", "VoiceButtons", "VoiceChatUtilities", "WaitForSlot",
    "ZipPreview"
]);

/**
 * Plugins that send data about you or the people you look at to servers other than Discord.
 * Plugins that only download a shared list (badges, banners, link rules) are not listed: they reveal no more than
 * visiting a website. `automatic` means it happens without you doing anything, which the privacy preset turns off.
 * Checked against each plugin's code; keep in sync when plugins change.
 */
export const SENDS_DATA: Record<string, { what: string; automatic: boolean; }> = {
    ReviewDB: { what: "IDs of the profiles you open, to ReviewDB (manti.vendicated.dev)", automatic: true },
    Decor: { what: "IDs of the people you see in chat, to Decor (decor.fieryflames.dev)", automatic: true },
    Dearrow: { what: "IDs of YouTube videos posted in chat, to DeArrow (sponsor.ajay.app)", automatic: true },
    ShowConnections: { what: "GitHub names from the profiles you open, to api.github.com", automatic: true },
    MessageTranslate: { what: "Text of messages, to Google Translate", automatic: true },
    MusicControls: { what: "The track you are playing, to lyrics services (lrclib.net and others)", automatic: true },
    MusicRichPresence: { what: "Your Last.fm or ListenBrainz username, to their API", automatic: true },
    Translate: { what: "Text you choose to translate, to Google, DeepL or Kagi", automatic: false },
    FileUpload: { what: "Files you upload with it, to the chosen file host", automatic: false },
    TenorGifSearch: { what: "Your GIF searches, to Tenor (Google)", automatic: false }
};

export type PluginTier = "curated" | "experimental" | "dev";

export function getPluginTier(name: string): PluginTier {
    // Required plugins are part of the client itself and cannot be turned off anyway
    if (Plugins[name]?.required) return "curated";
    if (DEV_TOOLS.has(name)) return "dev";
    const folder = PluginMeta[name]?.folderName ?? "";
    if (folder.startsWith("src/equicordplugins/") && !CURATED_EQUICORD.has(name)) return "experimental";
    return "curated";
}
