/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The QuickCSS editor comes from jsDelivr, which can be blocked or throttled. The window must then switch to the plain
// editor rather than stay blank, and must leave a working editor alone. Also the preload, which decides what a page
// gets: whatever is in the editor window only the three editor functions, and only other windows the full native API.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { load, ROOT } from "./helpers.mjs";

const EDITOR_URL = "https://cdn.jsdelivr.net/npm/@vencord/monaco-editor@1.0.0/dist/index.html";
const PLAIN_URL = "data:text/html;base64,PLAIN";
const EDITOR_ARG = "--nightcord-quick-css-editor";

const editorSource = readFileSync(join(ROOT, "src/main/quickCssEditor.ts"), "utf8")
    .replace('from "file://quickCssPlainEditor.html?minify&base64"', 'from "@test/html"');

async function loadEditor(t, windowOptions) {
    globalThis.DESKTOP_MONACO_EDITOR_URL = EDITOR_URL;
    const { loadQuickCssEditor } = await load({ contents: editorSource, resolveDir: "src/main" }, {
        "@test/html": "export default 'PLAIN';"
    });
    t.mock.timers.enable({ apis: ["setTimeout"] });

    const listeners = {};
    const win = {
        urls: [],
        destroyed: false,
        loading: false,
        started: true,
        ...windowOptions,
        isDestroyed: () => win.destroyed,
        on: (event, listener) => { listeners[event] = listener; },
        once: (event, listener) => { listeners[event] = listener; },
        emit: (event, ...args) => listeners[event]?.(...args),
        loadURL(url) {
            win.urls.push(url);
            return url === EDITOR_URL ? win.loadEditor() : Promise.resolve();
        },
        webContents: {
            isLoadingMainFrame: () => win.loading,
            executeJavaScript: async () => win.started
        }
    };
    return { win, loaded: loadQuickCssEditor(win) };
}

// lets the async steps after a timer or a failed load run
const settle = () => new Promise(resolve => setImmediate(resolve));

describe("loadQuickCssEditor", () => {
    it("leaves an editor that started alone", async t => {
        const { win, loaded } = await loadEditor(t, { loadEditor: async () => { } });
        await loaded;
        t.mock.timers.tick(60_000);
        await settle();
        assert.deepEqual(win.urls, [EDITOR_URL]);
    });

    it("switches right away when the page fails to load", async t => {
        const { win, loaded } = await loadEditor(t, { loadEditor: async () => { throw new Error("ERR_CONNECTION_RESET"); } });
        await loaded;
        assert.deepEqual(win.urls, [EDITOR_URL, PLAIN_URL]);

        t.mock.timers.tick(60_000);
        await settle();
        assert.equal(win.urls.length, 2, "the timer must not load it again");
    });

    it("switches after 10 seconds when the page stalls, and only once when that aborts the stalled load", async t => {
        let abort;
        const { win, loaded } = await loadEditor(t, {
            loading: true,
            loadEditor: () => new Promise((_, reject) => { abort = reject; })
        });

        t.mock.timers.tick(9_999);
        await settle();
        assert.deepEqual(win.urls, [EDITOR_URL]);

        t.mock.timers.tick(1);
        await settle();
        assert.deepEqual(win.urls, [EDITOR_URL, PLAIN_URL]);

        abort(new Error("ERR_ABORTED"));
        await loaded;
        assert.equal(win.urls.length, 2);
    });

    it("switches when the page loaded but its script never started the editor", async t => {
        const { win, loaded } = await loadEditor(t, { started: false, loadEditor: async () => { } });
        await loaded;
        assert.deepEqual(win.urls, [EDITOR_URL], "too early to tell");

        t.mock.timers.tick(10_000);
        await settle();
        assert.deepEqual(win.urls, [EDITOR_URL, PLAIN_URL]);
    });

    it("does nothing to a window closed in the meantime", async t => {
        const { win, loaded } = await loadEditor(t, { started: false, loadEditor: async () => { } });
        await loaded;
        win.destroyed = true;
        win.emit("closed");
        t.mock.timers.tick(10_000);
        await settle();
        assert.deepEqual(win.urls, [EDITOR_URL]);
    });

    it("does nothing when the load fails because the window was closed", async t => {
        const { win, loaded } = await loadEditor(t, {
            destroyed: true,
            loadEditor: async () => { throw new Error("ERR_FAILED"); }
        });
        await loaded;
        assert.deepEqual(win.urls, [EDITOR_URL]);
    });

    it("keeps Nightcord's window title", async t => {
        const { win, loaded } = await loadEditor(t, { loadEditor: async () => { } });
        await loaded;
        let prevented = false;
        win.emit("page-title-updated", { preventDefault: () => { prevented = true; } });
        assert.ok(prevented, "the page would rename the window to Vencord QuickCSS Editor");
    });
});

const preloadSource = readFileSync(join(ROOT, "src/preload.ts"), "utf8")
    .replace('from "electron/renderer"', 'from "@test/electron"')
    .replace('from "./NightcordNative"', 'from "@test/native"')
    .replace("require(process.env.DISCORD_PRELOAD!)", "globalThis.__preload.discordPreload = true");

async function runPreload(t, isEditorWindow) {
    globalThis.__preload = { exposed: [], discordPreload: false };
    const { argv } = process;
    t.after(() => { process.argv = argv; });
    process.argv = isEditorWindow ? ["electron", EDITOR_ARG] : ["electron", "--type=renderer"];
    await load({ contents: preloadSource, resolveDir: "src" }, {
        "@test/electron": `
            export const contextBridge = { exposeInMainWorld: name => globalThis.__preload.exposed.push(name) };
            export const webFrame = { executeJavaScript() {} };`,
        "@test/native": `
            export default { quickCss: { set() {}, get() {}, getEditorTheme() {} } };
            export const invoke = () => {};
            export const sendSync = () => "";`,
        "@shared/debounce": "export const debounce = f => f;",
        "@shared/IpcEvents": "export const IpcEvents = {};",
        "@shared/quickCssEditor": `export const QUICK_CSS_EDITOR_ARG = ${JSON.stringify(EDITOR_ARG)};`
    });
    return globalThis.__preload;
}

describe("preload", () => {
    it("gives the editor window only the three editor functions", async t => {
        const { exposed, discordPreload } = await runPreload(t, true);
        assert.deepEqual(exposed, ["setCss", "getCurrentCss", "getTheme"]);
        assert.equal(discordPreload, false, "Discord's own preload must not run there");
    });

    it("gives Discord's windows the native API and Discord's own preload", async t => {
        const { exposed, discordPreload } = await runPreload(t, false);
        assert.deepEqual(exposed, ["NightcordNative"]);
        assert.equal(discordPreload, true);
    });

    it("goes by the window, not by the page in it", () => {
        assert.ok(!/\blocation\./.test(preloadSource), "a redirect or an error page in the editor window would get the native API");
    });

    it("uses the same marker on both sides", () => {
        const shared = readFileSync(join(ROOT, "src/shared/quickCssEditor.ts"), "utf8");
        assert.ok(shared.includes(`QUICK_CSS_EDITOR_ARG = ${JSON.stringify(EDITOR_ARG)}`), "the marker changed");
        assert.match(readFileSync(join(ROOT, "src/main/ipcMain.ts"), "utf8"), /additionalArguments: \[QUICK_CSS_EDITOR_ARG\]/);
    });
});
