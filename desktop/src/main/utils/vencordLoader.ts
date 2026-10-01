/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2025 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash } from "crypto";
import { existsSync } from "fs";
import { readFileSync, renameSync, rmSync } from "original-fs";
import { join } from "path";

import { USER_AGENT } from "../constants";
import { VENCORD_DIR } from "../vencordDir";
import { downloadFile, fetchie } from "./http";

const API_BASE = "https://api.github.com";

export interface ReleaseData {
    name: string;
    tag_name: string;
    html_url: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
    }>;
}

export async function githubGet(endpoint: string) {
    const opts: RequestInit = {
        headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": USER_AGENT
        }
    };

    if (process.env.GITHUB_TOKEN) (opts.headers! as any).Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    return fetchie(API_BASE + endpoint, opts, { retryOnNetworkError: true });
}

// Nightcord Desktop: Nightcord's stable release, checked against the sha256 published next to it before use.
// Later updates come through Nightcord's own updater, which also checks the build's signed provenance.
const NIGHTCORD_ASAR = "https://github.com/1223321313333/Nightcord/releases/latest/download/equibop.asar";

export async function downloadVencordAsar() {
    const temp = VENCORD_DIR + ".download";
    const headers = { "User-Agent": USER_AGENT };
    await downloadFile(NIGHTCORD_ASAR, temp, { headers }, { retryOnNetworkError: true });

    const sums = await (await fetchie(NIGHTCORD_ASAR + ".sha256", { headers }, { retryOnNetworkError: true })).text();
    const expected = sums.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase();
    const actual = createHash("sha256").update(readFileSync(temp)).digest("hex");
    if (!expected || actual !== expected) {
        rmSync(temp, { force: true });
        throw new Error(
            `The Nightcord download is damaged or was changed (sha256 ${actual}, expected ${expected ?? "unknown"})`
        );
    }
    renameSync(temp, VENCORD_DIR);
}

export function isValidVencordInstall(dir: string) {
    return existsSync(join(dir, "equibop/main.js"));
}

export async function ensureVencordFiles() {
    if (existsSync(VENCORD_DIR)) return;

    await downloadVencordAsar();
}
