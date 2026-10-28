/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord code calls showToast(message, type); Discord's toast function takes a ToastData object. The adapter
// translates the message and maps Nightcord's type names onto Discord's three variants.

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let showToast;
before(async () => ({ showToast } = await load("src/utils/translatedToast.ts", {
    "@api/UiTranslation": "export const translateUi = text => 'ru:' + text;",
    "@webpack/common": "export const showToast = data => globalThis.__shown.push(data);"
})));
beforeEach(() => { globalThis.__shown = []; });

describe("translatedToast.showToast", () => {
    it("passes Discord's ToastData through untouched", () => {
        const data = { text: "Saved", variant: "success" };
        showToast(data);
        assert.equal(globalThis.__shown[0], data);
    });

    it("translates a message and maps the type to Discord's variant", () => {
        for (const [type, variant] of [["message", "default"], ["success", "success"], ["failure", "critical"], ["critical", "critical"]]) {
            showToast("Done", type);
            assert.deepEqual(globalThis.__shown.at(-1), { text: "ru:Done", variant }, type);
        }
    });

    it("falls back to the default variant for a missing or unknown type", () => {
        showToast("Done");
        showToast("Done", "fancy");
        assert.deepEqual(globalThis.__shown.map(d => d.variant), ["default", "default"]);
    });

    it("lets options override the defaults", () => {
        showToast("Done", "success", { duration: 5000, variant: "critical" });
        assert.deepEqual(globalThis.__shown[0], { text: "ru:Done", variant: "critical", duration: 5000 });
    });
});
