/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Channel, Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Menu, React, Toasts, UserStore } from "@webpack/common";

import { translate, TranslationValue } from "../../plugins/translate/utils";
import { isTranslatable } from "./detect";

const KEY = "Nightcord_AutoTranslateChannels";
const logger = new Logger("AutoTranslateChannel");

let channels = new Set<string>();
/** message id -> translation, so re-renders do not re-hit the translator */
const cache = new Map<string, TranslationValue>();
const inFlight = new Set<string>();

async function toggle(id: string) {
    if (channels.has(id)) channels.delete(id);
    else channels.add(id);
    await DataStore.set(KEY, [...channels]);
    Toasts.show({
        message: channels.has(id) ? "🌐 Этот чат будет переводиться автоматически" : "Автоперевод в этом чате выключен",
        type: Toasts.Type.MESSAGE,
        id: Toasts.genId()
    });
}

function Translation({ id, content }: { id: string; content: string; }) {
    const [res, setRes] = React.useState<TranslationValue | null>(cache.get(id) ?? null);

    React.useEffect(() => {
        if (res || inFlight.has(id)) return;
        inFlight.add(id);
        translate("received", content)
            .then(r => { cache.set(id, r); setRes(r); })
            .catch(err => logger.warn("translation failed", err))
            .finally(() => inFlight.delete(id));
    }, [id]);

    // nothing yet, or the message was already in the target language
    if (!res?.text || res.text.trim() === content.trim()) return null;

    return (
        <div style={{ marginTop: 2, padding: "6px 10px", borderRadius: 8, background: "var(--background-secondary-alt, var(--background-secondary))", fontSize: 14, lineHeight: 1.4 }}>
            <span style={{ opacity: 0.6, fontSize: 12 }}>🌐 перевод · {res.sourceLanguage}</span>
            <div>{res.text}</div>
        </div>
    );
}

const channelMenu: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel?.id) return;
    children.push(
        <Menu.MenuCheckboxItem
            id="nc-auto-translate"
            label="Переводить этот чат на русский"
            checked={channels.has(channel.id)}
            action={() => toggle(channel.id)}
        />
    );
};

export default definePlugin({
    name: "AutoTranslateChannel",
    description: "Turns on a chat to translate every incoming message on the fly, using the Translate plugin. Right-click a chat to toggle it. Messages are sent to the translation service, so turn it on only where you want that",
    tags: ["Chat", "Utility"],
    authors: [Devs.Nightcord],
    dependencies: ["Translate", "MessageAccessoriesAPI"],

    contextMenus: {
        "channel-context": channelMenu,
        "thread-context": channelMenu,
        "gdm-context": channelMenu,
        "user-context": (children, { channel }: { channel?: Channel; }) => {
            if (channel?.isDM?.()) channelMenu(children, { channel });
        }
    },

    async start() {
        try {
            channels = new Set(await DataStore.get<string[]>(KEY) ?? []);
        } catch {
            channels = new Set();
        }
    },

    renderMessageAccessory(props) {
        const message = props.message as Message;
        if (!channels.has(message?.channel_id)) return null;
        if (message.author?.id === UserStore.getCurrentUser()?.id) return null;
        if (!isTranslatable(message.content)) return null;
        return <Translation id={message.id} content={message.content} />;
    }
});
