/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, NavigationRouter, React, SelectedChannelStore, useLayoutEffect, useRef,UserStore } from "@webpack/common";

import style from "./style.css?managed";

const COLOR_STYLE_ID = "nc-keyword-color";
const HIT_CLASS = "nc-keyword-msg";

const settings = definePluginSettings({
    keywords: {
        type: OptionType.STRING,
        description: "Keywords to highlight, separated by commas (e.g. продажа, прокси, мой ник)",
        default: "",
        onChange: () => rebuild()
    },
    includeMyName: {
        type: OptionType.BOOLEAN,
        description: "Also highlight messages that mention your username or display name as plain text",
        default: true,
        onChange: () => rebuild()
    },
    color: {
        type: OptionType.STRING,
        description: "Highlight colour (any CSS colour)",
        default: "#f5a623",
        onChange: () => applyColor()
    },
    notify: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when a new message contains one of your keywords (your own name is only highlighted, Discord already notifies about mentions)",
        default: true
    }
});

/** Highlights: your keywords plus, optionally, your own name */
let matcher: RegExp | null = null;
/** Notifications: only the keywords you typed in */
let notifyMatcher: RegExp | null = null;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Unicode-aware "whole word" check so Russian words match too
function buildMatcher(words: string[]) {
    const unique = [...new Set(words.filter(w => w && w.length >= 2))];
    return unique.length
        ? new RegExp(`(?<![\\p{L}\\p{N}])(${unique.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "iu")
        : null;
}

function rebuild() {
    const keywords = settings.store.keywords.split(",").map(w => w.trim()).filter(Boolean);
    const names: string[] = [];

    if (settings.store.includeMyName) {
        const me = UserStore.getCurrentUser();
        if (me) names.push(me.username, (me as any).globalName);
    }

    matcher = buildMatcher([...keywords, ...names]);
    notifyMatcher = buildMatcher(keywords);
}

function applyColor() {
    let el = document.getElementById(COLOR_STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = COLOR_STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = `:root { --nc-keyword-color: ${settings.store.color || "#f5a623"}; }`;
}

/**
 * Invisible marker that tags its own message row with a class.
 * (A CSS :has() rule would do the same but makes every restyle of the chat slower.)
 */
function KeywordMarker({ keyword }: { keyword: string; }) {
    const ref = useRef<HTMLSpanElement>(null);
    useLayoutEffect(() => {
        const row = ref.current?.closest("[id^=\"chat-messages-\"]");
        row?.classList.add(HIT_CLASS);
        return () => row?.classList.remove(HIT_CLASS);
    }, []);
    return <span ref={ref} className="nc-keyword-hit" data-keyword={keyword} />;
}

function findKeyword(content: string | undefined, re = matcher) {
    if (!re || !content) return null;
    return content.match(re)?.[1] ?? null;
}

export default definePlugin({
    name: "KeywordHighlight",
    description: "Highlights messages containing your keywords and notifies you about new ones",
    tags: ["Chat", "Notifications"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,
    managedStyle: style,

    renderMessageAccessory(props) {
        const message = props.message as Message;
        if (message.author?.id === UserStore.getCurrentUser()?.id) return null;
        const hit = findKeyword(message.content);
        return hit ? <KeywordMarker keyword={hit} /> : null;
    },

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic || !settings.store.notify) return;
            if (message.author?.id === UserStore.getCurrentUser()?.id) return;
            // You are already looking at this chat
            if (message.channel_id === SelectedChannelStore.getChannelId() && document.hasFocus()) return;

            const hit = findKeyword(message.content, notifyMatcher);
            if (!hit) return;

            const channel = ChannelStore.getChannel(message.channel_id);
            const guildId = channel?.guild_id;
            const where = guildId
                ? `${GuildStore.getGuild(guildId)?.name ?? "Сервер"} · #${channel?.name}`
                : "Личные сообщения";

            showNotification({
                title: `«${hit}» — ${(message.author as any).globalName ?? message.author.username}`,
                body: `${where}: ${message.content.slice(0, 200)}`,
                color: settings.store.color,
                onClick: () => NavigationRouter.transitionTo(`/channels/${guildId ?? "@me"}/${message.channel_id}/${message.id}`)
            });
        },

        CONNECTION_OPEN() {
            rebuild();
        }
    },

    start() {
        rebuild();
        applyColor();
    },

    stop() {
        document.getElementById(COLOR_STYLE_ID)?.remove();
    }
});
