/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { NIGHTCORD_USER_AGENT } from "@shared/nightcordUserAgent";
import { createHash } from "crypto";
import { ipcMain } from "electron";
import { writeFileSync } from "original-fs";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { ASAR_FILE, serializeErrors } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
let PendingUpdate: string | null = null;
// Nightcord: sha256 of the pending desktop.asar as reported by GitHub, checked before the file replaces the install
let PendingUpdateDigest: string | null = null;

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": NIGHTCORD_USER_AGENT
        }
    });
}

async function calculateGitChanges() {
    const isOutdated = await fetchUpdates();
    if (!isOutdated) return [];

    const data = await githubGet(`/compare/${gitHash}...HEAD`);

    return data.commits.map((c: any) => ({
        hash: c.sha,
        author: c.author?.login ?? c.commit?.author?.name ?? "Unknown Author",
        message: c.commit.message.split("\n")[0]
    }));
}

async function fetchUpdates() {
    const data = await githubGet("/releases/latest");

    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
        return false;

    const asset = data.assets.find(a => a.name === ASAR_FILE);
    if (!asset) throw new Error(`The latest release has no ${ASAR_FILE}`);
    PendingUpdate = asset.browser_download_url;
    PendingUpdateDigest = typeof asset.digest === "string" && asset.digest.startsWith("sha256:")
        ? asset.digest.slice("sha256:".length).toLowerCase()
        : null;

    return true;
}

/** The expected sha256 of the update: GitHub's asset digest, or the desktop.asar.sha256 file CI publishes next to it */
async function getExpectedDigest(url: string) {
    if (PendingUpdateDigest) return PendingUpdateDigest;

    const text = (await fetchBuffer(url + ".sha256")).toString("utf8");
    const digest = text.match(/\b[a-f0-9]{64}\b/i)?.[0];
    if (!digest) throw new Error("Could not get the checksum of the update, not installing it");
    return digest.toLowerCase();
}

async function applyUpdates() {
    if (!PendingUpdate) return true;

    // The update replaces the running asar; a folder install (local build) has nothing to replace
    if (!__dirname.endsWith(".asar")) throw new Error("Nightcord is running from a local build folder. Rebuild it to update.");

    const data = await fetchBuffer(PendingUpdate);
    const expected = await getExpectedDigest(PendingUpdate);
    const actual = createHash("sha256").update(data).digest("hex");
    if (actual !== expected) throw new Error(`The downloaded update is damaged or was changed (sha256 ${actual}, expected ${expected}). Not installing it.`);

    writeFileSync(__dirname, data, { flush: true });

    PendingUpdate = null;
    PendingUpdateDigest = null;

    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
