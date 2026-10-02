/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, GuildMemberStore, React, RelationshipStore, UserStore } from "@webpack/common";

import { buildFriendMap, findImpersonation, FriendRef } from "./detect";

let friendMap = new Map<string, FriendRef>();

function rebuild() {
    try {
        const friends: FriendRef[] = [];
        for (const id of RelationshipStore.getFriendIDs()) {
            const u = UserStore.getUser(id) as any;
            if (!u) continue;
            const name = u.globalName || u.username;
            if (!name) continue;
            const aliases = u.username && u.username !== name ? [u.username] : [];
            friends.push({ id, name, avatar: u.avatar, aliases });
        }
        friendMap = buildFriendMap(friends);
    } catch {
        // a store not being ready yet must never break rendering
    }
}

const box: React.CSSProperties = {
    marginTop: 4,
    padding: "8px 12px",
    borderRadius: 8,
    borderLeft: "3px solid var(--status-danger, #f23f42)",
    background: "color-mix(in srgb, var(--status-danger, #f23f42) 12%, var(--background-secondary, transparent))",
    fontSize: 14,
    lineHeight: 1.4
};

export default definePlugin({
    name: "ImpersonationGuard",
    description: "Warns you when someone copies the name (or avatar) of one of your friends but is a different account — the fake-friend scam",
    tags: ["Privacy", "Chat"],
    authors: [Devs.Nightcord],
    dependencies: ["MessageAccessoriesAPI"],
    enabledByDefault: true,

    flux: {
        CONNECTION_OPEN: rebuild,
        RELATIONSHIP_ADD: rebuild,
        RELATIONSHIP_REMOVE: rebuild,
        RELATIONSHIP_UPDATE: rebuild
    },

    start: rebuild,

    renderMessageAccessory(props) {
        const message = props.message as Message & { webhook_id?: string; };
        const author = message?.author as any;
        if (!author?.id || message.webhook_id || author.bot) return null;

        const me = UserStore.getCurrentUser()?.id;
        if (author.id === me || RelationshipStore.isFriend(author.id)) return null;

        if (!friendMap.size) rebuild();
        if (!friendMap.size) return null;

        const channel = ChannelStore.getChannel(message.channel_id) as Channel | undefined;
        const nick = channel?.guild_id ? GuildMemberStore.getNick(channel.guild_id, author.id) : undefined;
        const hit = findImpersonation([nick, author.globalName, author.username], author.id, author.avatar, friendMap);
        if (!hit) return null;

        const text = hit.sameAvatar
            ? `Этот аккаунт выдаёт себя за вашего друга ${hit.friend}: и имя, и аватар как у него, но это другой аккаунт.`
            : `Имя как у вашего друга ${hit.friend}, но это другой аккаунт. Убедитесь, что это действительно он.`;

        return (
            <div style={box}>
                <span style={{ fontWeight: 600, color: "var(--status-danger, #f23f42)" }}>⚠️ Похоже на подделку. </span>
                {text}
            </div>
        );
    }
});
