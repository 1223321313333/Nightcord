/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The custom-theme accent shading derives HSL values from the chosen colour. rgbToHsl is the pure maths
// behind that (toHsl wraps it around a canvas-based colour parser), tested here against known colours.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let rgbToHsl;
before(async () => ({ rgbToHsl } = await load("src/nightcordplugins/nightcord/theme.ts")));

describe("rgbToHsl", () => {
    it("handles black, white and mid grey (no hue or saturation)", () => {
        assert.deepEqual(rgbToHsl(0, 0, 0), [0, 0, 0]);
        assert.deepEqual(rgbToHsl(255, 255, 255), [0, 0, 100]);
        assert.deepEqual(rgbToHsl(128, 128, 128), [0, 0, 50.2]);
    });

    it("maps the primary and secondary hues", () => {
        assert.deepEqual(rgbToHsl(255, 0, 0), [0, 100, 50]);
        assert.deepEqual(rgbToHsl(0, 255, 0), [120, 100, 50]);
        assert.deepEqual(rgbToHsl(0, 0, 255), [240, 100, 50]);
        assert.deepEqual(rgbToHsl(255, 0, 255), [300, 100, 50]); // magenta: g < b branch wraps the hue
    });

    it("rounds hue, saturation and lightness to one decimal", () => {
        const [h, s, l] = rgbToHsl(139, 92, 246); // the Nightcord accent
        for (const v of [h, s, l]) assert.equal(v, +v.toFixed(1));
        assert.ok(h > 250 && h < 260, `hue ${h}`);
    });
});
