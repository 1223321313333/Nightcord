/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord's startup steps: the welcome window and the auto backup on every start, and in safe mode a notice that
// says why plugins are off, with a button that turns them back on. The notice uses t(), which follows the
// RussianNightcord setting, because in safe mode the plugin itself does not run. The module's relative imports are
// pointed at stubs here, so the test controls safe mode and sees what the module calls.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { load, ROOT } from "./helpers.mjs";

const source = readFileSync(join(ROOT, "src/utils/nightcordStartup.ts"), "utf8");
const contents = source
    .replace('from "./autoBackup"', 'from "@test/autoBackup"')
    .replace('from "./i18n"', 'from "@test/i18n"')
    .replace('from "./safeMode"', 'from "@test/safeMode"');

const stubs = {
    "@test/autoBackup": "export const scheduleAutoBackup = async () => { globalThis.__startup.backups++; };",
    "@test/i18n": "export const t = text => 'ru:' + text;",
    "@test/safeMode": "export const STARTUP = { safeMode: globalThis.__startup.safeMode }; export const leaveSafeMode = () => { globalThis.__startup.left++; };",
    "@api/Notices": "export const showNotice = (...args) => globalThis.__startup.notices.push(args);",
    "@components/settings/tabs/nightcord/Welcome": "export const showStartupModals = async () => { globalThis.__startup.welcomes++; };"
};

async function start(t, safeMode) {
    globalThis.__startup = { safeMode, backups: 0, welcomes: 0, left: 0, notices: [] };
    const { runNightcordStartup } = await load({ contents, resolveDir: "src/utils" }, stubs);
    t.mock.timers.enable({ apis: ["setTimeout"] });
    runNightcordStartup();
    return globalThis.__startup;
}

describe("runNightcordStartup", () => {
    it("rewrote all three relative imports", () => {
        assert.ok(!/from "\.\//.test(contents), "the test would load a real module instead of its stub");
    });

    it("shows the welcome window and schedules the auto backup on every start", async t => {
        const state = await start(t, false);
        t.mock.timers.tick(10_000);
        assert.equal(state.welcomes, 1);
        assert.equal(state.backups, 1);
        assert.deepEqual(state.notices, [], "no safe mode notice outside safe mode");
    });

    it("in safe mode says why after 3 seconds, translated, with a button that turns plugins back on", async t => {
        const state = await start(t, true);
        assert.equal(state.welcomes, 1);
        assert.equal(state.backups, 1);

        t.mock.timers.tick(2_999);
        assert.equal(state.notices.length, 0);
        t.mock.timers.tick(1);
        assert.equal(state.notices.length, 1);

        const [message, button, onClick] = state.notices[0];
        assert.match(message, /^ru:Discord did not start properly several times in a row/);
        assert.equal(button, "ru:Turn plugins back on");
        onClick();
        assert.equal(state.left, 1);
    });
});
