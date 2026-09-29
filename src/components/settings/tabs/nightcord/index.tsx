/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./NightcordTab.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "@components/Icons";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { openPluginModal, SettingsTab, wrapTab } from "@components/settings";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SpecialCard } from "@components/settings/SpecialCard";
import BadgeAPI from "@plugins/_api/badges";
import SettingsPlugin from "@plugins/_core/settings";
import { gitRemote } from "@shared/nightcordUserAgent";
import { DONOR_ROLE_ID, GUILD_ID, IS_WINDOWS, VC_DONOR_ROLE_ID, VC_GUILD_ID } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { Alerts, GuildMemberStore, React } from "@webpack/common";

import { MacOSVibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";
import { PluginPresets } from "./PluginPresets";
import { LocalTraces, PrivacyCheckup } from "./PrivacyCheckup";
import { WindowsMaterialSettings } from "./WindowsMaterialSettings";

const NIGHTCORD_IMAGE = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#6d28d9' d='M21.64 13.2a1 1 0 0 0-1.2-.26 7.5 7.5 0 0 1-9.38-9.38 1 1 0 0 0-1.46-1.2A10 10 0 1 0 21.9 14.4a1 1 0 0 0-.26-1.2Z'/></svg>");

const cl = classNameFactory("vc-nightcord-tab-");

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function Switches() {
    const settings = useSettings(["useQuickCss", "enableReactDevtools", "mainWindowFrameless", "frameless", "winNativeTitleBar", "transparent", "winCtrlQ", "disableMinSize"]);

    const Switches = [
        {
            key: "useQuickCss",
            title: t("Enable Custom CSS"),
            description: t("Apply your configured QuickCSS")
        },
        (!IS_WEB && !IS_DISCORD_DESKTOP || !IS_WINDOWS) && {
            key: "mainWindowFrameless",
            title: t("Disable the Main Window Frame"),
            description: t("Remove the native window frame for a cleaner look. You can still move the window by dragging the title bar area."),
            restartRequired: true,
        },
        !IS_WEB && (!IS_DISCORD_DESKTOP || !IS_WINDOWS
            ? {
                key: "frameless",
                title: t("Disable All Window Frames"),
                description: t("Remove the native window frame for a cleaner look. You can still move the window by dragging the title bar area."),
                restartRequired: true,
            }
            : {
                key: "winNativeTitleBar",
                title: t("Use Windows' native title bar instead of Discord's custom one"),
                description: t("Replace Discord's custom title bar with the standard Windows title bar. This may improve compatibility with some window management tools."),
                restartRequired: true,
            }
        ),
        !IS_WEB && {
            key: "transparent",
            title: t("Enable Window Transparency"),
            description: t("Make the Discord window transparent. A theme that supports transparency is required or this will do nothing."),
            restartRequired: true,
            warning: IS_WINDOWS
                ? "This will stop the window from being resizable and prevents you from snapping the window to screen edges."
                : "This will stop the window from being resizable.",
        },
        IS_DISCORD_DESKTOP && {
            key: "disableMinSize",
            title: t("Disable Minimum Window Size"),
            description: t("Allows you to resize the window to any size, even smaller than Discord's minimum size"),
            restartRequired: true
        },
        !IS_WEB && IS_WINDOWS && {
            key: "winCtrlQ",
            title: t("Register Ctrl+Q as shortcut to close Discord"),
            description: t("Add Ctrl+Q as a keyboard shortcut to close Discord. This provides an alternative to Alt+F4 for quickly closing the application."),
            restartRequired: true,
        },
        !IS_WEB && {
            key: "enableReactDevtools",
            title: t("Enable React Developer Tools"),
            description: t("Mainly useful for plugin developers. Ignore this if you don't know what it is"),
            restartRequired: true
        },
    ] satisfies Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
        warning?: string;
    }>;

    return Switches.map(setting => {
        if (!setting) {
            return null;
        }

        const { key, title, description, restartRequired, warning } = setting;

        return (
            <FormSwitch
                key={key}
                title={title}
                description={
                    warning ? (
                        <>
                            {description}
                            <Notice.Warning className={Margins.top8} style={{ width: "100%" }}>
                                {warning}
                            </Notice.Warning>
                        </>
                    ) : (
                        description
                    )
                }
                value={settings[key]}
                hideBorder
                onChange={v => {
                    settings[key] = v;

                    if (restartRequired) {
                        Alerts.show({
                            title: t("Restart Required"),
                            body: "A restart is required to apply this change",
                            confirmText: t("Restart now"),
                            cancelText: t("Later!"),
                            onConfirm: relaunch
                        });
                    }
                }}
            />
        );
    });
}

function NightcordSettings() {
    return (
        <SettingsTab>
            <SpecialCard
                title="Nightcord"
                subtitle={t("Your own Discord client mod")}
                description={t("Nightcord is based on Equicord and Vencord (GPL-3.0). Updates come from your GitHub repository.")}
                cardImage={NIGHTCORD_IMAGE}
                backgroundColor="#5b3fa8"
                buttonTitle={t("Open repository on GitHub")}
                buttonOnClick={() => NightcordNative.native.openExternal("https://github.com/" + gitRemote)}
            />

            <Heading className={Margins.top16}>{t("Quick Actions")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Common actions you might want to perform. These shortcuts give you quick access to frequently used features without navigating through menus.")}
            </Paragraph>

            <QuickActionCard>
                <QuickAction
                    Icon={LogIcon}
                    text={t("Notification Log")}
                    action={openNotificationLogModal}
                />
                <QuickAction
                    Icon={PaintbrushIcon}
                    text={t("Edit QuickCSS")}
                    action={() => NightcordNative.quickCss.openEditor()}
                />
                {!IS_WEB && (
                    <QuickAction
                        Icon={RestartIcon}
                        text={t("Relaunch Discord")}
                        action={relaunch}
                    />
                )}
                {!IS_WEB && (
                    <QuickAction
                        Icon={FolderIcon}
                        text={t("Open Settings Folder")}
                        action={() => NightcordNative.settings.openFolder()}
                    />
                )}
                <QuickAction
                    Icon={GithubIcon}
                    text={t("View Source Code")}
                    action={() =>
                        NightcordNative.native.openExternal(
                            "https://github.com/" + gitRemote,
                        )
                    }
                />
            </QuickActionCard>

            <PluginPresets />

            <PrivacyCheckup />

            <LocalTraces />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>{t("Client Settings")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Configure how Nightcord behaves and integrates with Discord. These settings affect the Discord client's appearance and behavior.")}
            </Paragraph>
            <Notice.Info className={Margins.bottom20} style={{ width: "100%" }}>
                {t("You can customize where this settings section appears in Discord's settings menu by configuring the")}{" "}
                <a
                    role="button"
                    onClick={() => openPluginModal(SettingsPlugin)}
                    style={{ cursor: "pointer", color: "var(--text-link)" }}
                >
                    {t("Settings Plugin")}
                </a>.
            </Notice.Info>

            <Switches />

            <MacOSVibrancySettings />
            <WindowsMaterialSettings />

            <NotificationSection />
        </SettingsTab >
    );
}

export default wrapTab(NightcordSettings, t("Nightcord Settings"));

export function isEquicordDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getNightcordDonorBadges(userId);
    return GuildMemberStore.getMember(GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID) || !!donorBadges;
}

export function isVencordDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getDonorBadges(userId);
    return GuildMemberStore.getMember(VC_GUILD_ID, userId)?.roles.includes(VC_DONOR_ROLE_ID) || !!donorBadges;
}
