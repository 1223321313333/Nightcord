/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

// Pure parsing for the updater, with no network, git or filesystem dependencies, so it can be unit
// tested. The HTTP ones decide which commit an update is and what sha256 it must match before it
// replaces the running install, so getting them wrong is a security problem — hence the tests. The
// wiring (fetching releases, running git, downloading, hashing and writing) lives in http.ts and git.ts.

/** The commit hash a GitHub release encodes in its name, which is the text after the last space. */
export function parseReleaseHash(releaseName: string): string {
    return releaseName.slice(releaseName.lastIndexOf(" ") + 1);
}

/** A release-name hash, kept only when it looks like a git hash (7–40 hex chars); otherwise null. */
export function parsePendingHash(hash: string): string | null {
    return /^[0-9a-f]{7,40}$/.test(hash) ? hash : null;
}

/** The sha256 from a GitHub asset's `digest` field ("sha256:<hex>"), lower-cased, or null if absent/other. */
export function parseAssetDigest(digest: unknown): string | null {
    return typeof digest === "string" && digest.startsWith("sha256:")
        ? digest.slice("sha256:".length).toLowerCase()
        : null;
}

/** The first 64-hex sha256 in a `.sha256` checksum file, lower-cased, or null if the file has none. */
export function parseChecksumFile(text: string): string | null {
    return text.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase() ?? null;
}

// --- git updater (local clone installs) ---

/** `git remote get-url origin` output turned into an https repo URL (scp-form to https, no .git suffix). */
export function parseRemoteUrl(stdout: string): string {
    return stdout.trim()
        .replace(/git@(.+):/, "https://$1/")
        .replace(/\.git$/, "");
}

export interface GitChange {
    hash: string;
    author: string;
    message: string;
}

/** `git log --pretty=format:%an/%h/%s` output parsed into one entry per commit; [] when there are none. */
export function parseGitChanges(stdout: string): GitChange[] {
    const commits = stdout.trim();
    if (!commits) return [];

    return commits.split("\n").map(line => {
        const [author, hash, ...rest] = line.split("/");
        return {
            hash,
            author,
            message: rest.join("/").split("\n")[0]
        };
    });
}
