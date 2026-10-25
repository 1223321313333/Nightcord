/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@nightcord/discord-types";

import { markupToText } from "../_shared/messages";

/**
 * A short text preview of a bookmarked message, pure so it can be tested. Prefers the message text, then
 * its attachments, then the first embed's title/description, then a sticker, and finally a placeholder.
 */
export function describeBookmark(msg: Message, guildId: string | null): string {
    const text = markupToText(msg.content ?? "", { guildId }).trim();
    if (text) return text;

    const files = msg.attachments?.map(a => a.filename);
    if (files?.length) return `📎 ${files.join(", ")}`;

    const embed = msg.embeds?.[0] as any;
    const embedText = embed?.rawTitle ?? embed?.title ?? embed?.rawDescription ?? embed?.description;
    if (embedText) return `▌ ${embedText}`;

    const sticker = (msg as any).stickerItems?.[0]?.name;
    if (sticker) return `🏷️ стикер «${sticker}»`;

    return "(без текста)";
}
