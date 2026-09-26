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

const EN = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./~QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>";
const RU = "ёйцукенгшщзхъфывапролджэячсмитьбю.ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ";

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
    }
});

const hasCyrillic = (s: string) => /[а-яё]/i.test(s);

/** Converts text to the other layout. Direction is picked from the text itself. */
export function switchLayout(text: string) {
    const map = hasCyrillic(text) ? ruToEn : enToRu;
    return [...text].map(c => map.get(c) ?? c).join("");
}

/**
 * Russian typed on an English layout has almost no a/e/i/o,
 * because Russian vowels sit on f, t, b, j, s, z, ' and so on.
 */
function looksLikeWrongLayout(text: string) {
    if (hasCyrillic(text)) return false;
    // Leave links, mentions, emoji, commands and code alone
    if (/https?:\/\/|<[@#:a]|:\w+:|^[/!.]|`/.test(text)) return false;

    const letters = text.match(/[a-z]/gi) ?? [];
    // Short slang like "gg wp" or "brb" is left alone
    if (letters.length < 6 || !/[a-z]{4,}/i.test(text)) return false;

    const vowels = letters.filter(c => "aeio".includes(c.toLowerCase())).length;
    return vowels / letters.length < 0.12;
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
        if (looksLikeWrongLayout(msg.content)) msg.content = switchLayout(msg.content);
    }
});
