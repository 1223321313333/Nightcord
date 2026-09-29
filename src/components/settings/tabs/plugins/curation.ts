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

export type PluginTier = "curated" | "experimental" | "dev";

export function getPluginTier(name: string): PluginTier {
    // Required plugins are part of the client itself and cannot be turned off anyway
    if (Plugins[name]?.required) return "curated";
    if (DEV_TOOLS.has(name)) return "dev";
    const folder = PluginMeta[name]?.folderName ?? "";
    if (folder.startsWith("src/equicordplugins/") && !CURATED_EQUICORD.has(name)) return "experimental";
    return "curated";
}
