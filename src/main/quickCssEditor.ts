/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow } from "electron";
import plainEditorHtml from "file://quickCssPlainEditor.html?minify&base64";

const START_TIMEOUT_MS = 10_000;

// The editor page and its script come from jsDelivr. Where that CDN is blocked or throttled the page can fail, stall,
// or load without its script, each of which leaves a blank window that saves nothing. So give the editor some time
// to appear, and otherwise switch to a plain editor that saves the same way.
export async function loadQuickCssEditor(win: BrowserWindow) {
    // the page calls itself "Vencord QuickCSS Editor"
    win.on("page-title-updated", e => e.preventDefault());

    let usingPlainEditor = false;
    const usePlainEditor = async () => {
        if (usingPlainEditor || win.isDestroyed()) return;
        usingPlainEditor = true;
        await win.loadURL(`data:text/html;base64,${plainEditorHtml}`);
    };

    const editorStarted = async () => {
        const { webContents } = win;
        if (webContents.isLoadingMainFrame()) return false;
        return webContents.executeJavaScript("document.getElementById('container')?.childElementCount > 0").catch(() => false);
    };

    const timeout = setTimeout(async () => {
        if (win.isDestroyed() || await editorStarted()) return;
        await usePlainEditor();
    }, START_TIMEOUT_MS);
    win.once("closed", () => clearTimeout(timeout));

    await win.loadURL(DESKTOP_MONACO_EDITOR_URL).catch(usePlainEditor);
}
