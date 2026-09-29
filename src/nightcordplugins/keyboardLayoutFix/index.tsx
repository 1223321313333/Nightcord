/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { Toasts } from "@webpack/common";

// Same physical keys on the US and Russian (ЙЦУКЕН) layouts, shifted symbols included
const EN = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./~QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?@#$^&|";
const RU = "ёйцукенгшщзхъфывапролджэячсмитьбю.ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,\"№;:?/";

const enToRu = new Map<string, string>();
const ruToEn = new Map<string, string>();
for (let i = 0; i < EN.length; i++) {
    enToRu.set(EN[i], RU[i]);
    ruToEn.set(RU[i], EN[i]);
}

const settings = definePluginSettings({
    autoFix: {
        type: OptionType.BOOLEAN,
        description: "Automatically fix messages that were clearly typed in the English layout instead of Russian (e.g. ghbdtn → привет)",
        default: true
    },
    notifyOnFix: {
        type: OptionType.BOOLEAN,
        description: "Show a notification with the original text when a message was fixed automatically",
        default: true
    }
});

const hasCyrillic = (s: string) => /[а-яё]/i.test(s);

const convert = (text: string, map: Map<string, string>) => [...text].map(c => map.get(c) ?? c).join("");

/** Converts text to the other layout. Direction is picked from the text itself. */
export function switchLayout(text: string) {
    return convert(text, hasCyrillic(text) ? ruToEn : enToRu);
}

/** Words that must never be converted: links, mentions, emoji, emoticons and anything with digits */
function isProtected(token: string) {
    return /^(https?:\/\/|www\.)/i.test(token)
        || /^<.*>$/.test(token) // <@user>, <#channel>, <:emoji:id>, <t:time>
        || /^:\w+:$/.test(token) // :emoji:
        || /\d/.test(token) // cs2, 1v1, 10pm
        || /^[:;=xX8][-']?[()[\]DPpOo|\\/3*]+$/.test(token) // :D xD ;)
        || /^[^\p{L}]+$/u.test(token); // only punctuation or emoji
}

// Russian letters on these keys (ф, ш, щ) make up ~1.5% of Russian text; a, i and o are ~23% of English.
// "e" and "u" are not counted: they are the keys of the common Russian "у" and "г".
const EN_VOWELS = new Set("aio");
const RU_VOWELS = new Set("аеёиоуыэюя");

function vowelShare(text: string, letters: RegExp, vowels: Set<string>) {
    const found = text.toLowerCase().match(letters) ?? [];
    return found.length ? found.filter(c => vowels.has(c)).length / found.length : 0;
}

/**
 * Whether Latin text is really Russian typed on the English layout.
 * Such text has almost no a/i/o (Russian vowels sit on f, t, b, j, s, z, ' ...), and once converted it has
 * a normal share of Russian vowels. The second check keeps things like "xDDDDD", "hmmmmm" or "rhythm" intact.
 */
export function looksLikeWrongLayout(words: string[]) {
    const text = words.join(" ");
    if (hasCyrillic(text)) return false;

    const letters = text.match(/[a-z]/gi) ?? [];
    // Short slang like "gg wp" or "brb" is left alone
    if (letters.length < 6 || !/[a-z]{4,}/i.test(text)) return false;
    // Long runs of one letter are laughter or noise, not words
    if (/([a-z])\1{3,}/i.test(text)) return false;

    if (vowelShare(text, /[a-z]/g, EN_VOWELS) >= 0.07) return false;

    const ru = vowelShare(convert(text, enToRu), /[а-яё]/g, RU_VOWELS);
    return ru >= 0.28 && ru <= 0.6;
}

/** Fixes a whole message, leaving links, mentions and emoji as they are. Returns null when nothing should change. */
export function fixMessage(content: string) {
    if (!content || hasCyrillic(content)) return null;
    // Commands for bots and code are never touched
    if (/^[/!.$?]/.test(content) || content.includes("`")) return null;

    const parts = content.split(/(\s+)/);
    const words = parts.filter((p, i) => i % 2 === 0 && p && !isProtected(p));
    if (!looksLikeWrongLayout(words)) return null;

    return parts.map((p, i) => i % 2 === 0 && p && !isProtected(p) ? convert(p, enToRu) : p).join("");
}

function getChatInput() {
    return document.querySelector<HTMLElement>('[role="textbox"][data-slate-editor="true"]');
}

function fixDraft() {
    const input = getChatInput();
    if (!input) return;

    const selection = window.getSelection();
    let text = selection && input.contains(selection.anchorNode) ? selection.toString() : "";

    if (!text) {
        // Nothing selected: select the whole draft so the converted text replaces it
        input.focus();
        const range = document.createRange();
        range.selectNodeContents(input);
        selection?.removeAllRanges();
        selection?.addRange(range);
        text = input.innerText.replace(/\n$/, "");
    }

    if (!text.trim()) {
        Toasts.show({ message: "Нечего переводить", type: Toasts.Type.MESSAGE, id: Toasts.genId() });
        return;
    }

    const converted = switchLayout(text);
    // Let the editor pick up the new selection before replacing it
    setTimeout(() => insertTextIntoChatInputBox(converted), 0);
}

const LayoutIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="sans-serif">Аa</text>
    </svg>
);

const LayoutButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    return (
        <ChatBarButton tooltip="Сменить раскладку текста (выделенного или всего)" onClick={fixDraft}>
            <LayoutIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "KeyboardLayoutFix",
    description: "Fixes text typed in the wrong keyboard layout (ghbdtn → привет). Chat bar button plus optional auto-fix on send.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Nightcord],
    enabledByDefault: true,
    settings,

    chatBarButton: {
        icon: LayoutIcon,
        render: LayoutButton
    },

    onBeforeMessageSend(_, msg) {
        if (!settings.store.autoFix) return;
        const fixed = fixMessage(msg.content);
        if (fixed == null || fixed === msg.content) return;

        const original = msg.content;
        msg.content = fixed;
        if (settings.store.notifyOnFix) {
            Toasts.show({
                message: `Раскладка исправлена. Было: ${original.length > 60 ? original.slice(0, 60) + "…" : original}`,
                type: Toasts.Type.MESSAGE,
                id: Toasts.genId()
            });
        }
    }
});
