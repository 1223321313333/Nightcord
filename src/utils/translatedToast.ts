/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { translateUi } from "@api/UiTranslation";
import type { ToastData, ToastVariant } from "@nightcord/discord-types";
import { showToast as showDiscordToast } from "@webpack/common";

// Nightcord code shows toasts as (message, type), with the message translated into the user's language. Discord's
// own toast function, which @webpack/common exports as Equicord has it, takes a ToastData object. This lives apart
// from @webpack/common because Equicord changes its toast code often, so syncing with Equicord does not conflict.

const variants: Record<string, ToastVariant> = {
    message: "default", success: "success", failure: "critical", default: "default", critical: "critical"
};

/** Shows a toast from Discord's ToastData object, or from a message (translated) and a type such as "success" */
export function showToast(message: string | ToastData, type?: string, options?: Partial<ToastData>) {
    if (typeof message !== "string") return showDiscordToast(message);
    showDiscordToast({ text: translateUi(message), variant: variants[type ?? ""] ?? "default", ...options });
}
