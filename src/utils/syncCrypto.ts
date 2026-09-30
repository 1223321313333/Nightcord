/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Password encryption for the settings backup Nightcord keeps in the user's own Discord server.
// File: "NCSYNC1" | salt (16) | iv (12) | AES-256-GCM(gzip(JSON)). Key: PBKDF2-SHA-256, 600 000 rounds.

const MAGIC = new TextEncoder().encode("NCSYNC1");
const ROUNDS = 600_000;

async function keyFrom(password: string, salt: Uint8Array<ArrayBuffer>) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations: ROUNDS },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream) {
    return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function encryptBackup(json: string, password: string): Promise<Uint8Array<ArrayBuffer>> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("gzip"));
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: MAGIC }, await keyFrom(password, salt), packed));

    const out = new Uint8Array(MAGIC.length + salt.length + iv.length + sealed.length);
    out.set(MAGIC);
    out.set(salt, MAGIC.length);
    out.set(iv, MAGIC.length + salt.length);
    out.set(sealed, MAGIC.length + salt.length + iv.length);
    return out;
}

/** Throws WrongPasswordError when the password does not fit (or the file was changed) */
export async function decryptBackup(file: Uint8Array<ArrayBuffer>, password: string) {
    if (file.length < MAGIC.length + 28 + 16 || MAGIC.some((b, i) => file[i] !== b)) throw new Error("not a Nightcord backup");
    const salt = file.subarray(MAGIC.length, MAGIC.length + 16);
    const iv = file.subarray(MAGIC.length + 16, MAGIC.length + 28);

    let packed: Uint8Array<ArrayBuffer>;
    try {
        packed = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: MAGIC }, await keyFrom(password, salt), file.subarray(MAGIC.length + 28)));
    } catch {
        throw new WrongPasswordError();
    }
    return new TextDecoder().decode(await pipe(packed, new DecompressionStream("gzip")));
}

export class WrongPasswordError extends Error {
    constructor() {
        super("wrong password");
    }
}
