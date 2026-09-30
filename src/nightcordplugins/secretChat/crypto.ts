/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// End-to-end encryption for DMs between Nightcord users, with WebCrypto only.
// Each user has an X25519 key pair that never leaves their computer. Both sides of a DM derive the same AES-256-GCM
// key: ECDH(own private key, peer's public key) -> HKDF-SHA-256 bound to the DM channel and both user ids.
// Every message gets a fresh random IV; the author's id and the channel are authenticated data, so a message cannot be
// moved to another chat or passed off as the other person's.

/** In a message: a public key offer, `||ncpk1:<32 bytes, base64>||` */
export const KEY_TAG = "ncpk1:";
/** In a message: an encrypted text, `||nc1:<12-byte IV + AES-GCM ciphertext, base64>||` */
export const MESSAGE_TAG = "nc1:";
/** Discord's message limit without Nitro */
export const MAX_CONTENT = 2000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: Uint8Array) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
}

export function fromBase64(b64: string) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export async function generateKeyPair() {
    // the private key cannot be exported, only used: it stays in this browser profile's storage
    return crypto.subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]) as Promise<CryptoKeyPair>;
}

export async function exportPublicKey(key: CryptoKey) {
    return toBase64(new Uint8Array(await crypto.subtle.exportKey("raw", key)));
}

function importPublicKey(b64: string) {
    const raw = fromBase64(b64);
    if (raw.length !== 32) throw new Error("not an X25519 public key");
    return crypto.subtle.importKey("raw", raw, { name: "X25519" }, true, []);
}

/** The AES key both people in a DM derive */
export async function deriveChatKey(ownPrivate: CryptoKey, peerPublicB64: string, channelId: string, userIds: [string, string]) {
    const shared = await crypto.subtle.deriveBits({ name: "X25519", public: await importPublicKey(peerPublicB64) }, ownPrivate, 256);
    const hkdf = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
    const info = `nightcord dm ${channelId} ${[...userIds].sort().join(" ")}`;
    return crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: encoder.encode("nightcord-secret-chat-v1"), info: encoder.encode(info) },
        hkdf,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

const aad = (channelId: string, authorId: string) => encoder.encode(`${channelId}:${authorId}`);

/** The message content to send instead of `text` */
export async function encryptMessage(key: CryptoKey, text: string, channelId: string, authorId: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(channelId, authorId) }, key, encoder.encode(text)));
    const payload = new Uint8Array(iv.length + sealed.length);
    payload.set(iv);
    payload.set(sealed, iv.length);
    return `🔒 ||${MESSAGE_TAG}${toBase64(payload)}||`;
}

/** Throws if the message was changed, is for another chat or author, or the key is wrong */
export async function decryptMessage(key: CryptoKey, payloadB64: string, channelId: string, authorId: string) {
    const payload = fromBase64(payloadB64);
    if (payload.length < 12 + 16) throw new Error("too short");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: payload.subarray(0, 12), additionalData: aad(channelId, authorId) }, key, payload.subarray(12));
    return decoder.decode(plain);
}

const B64 = "[A-Za-z0-9+/]+={0,2}";
const MESSAGE_RE = new RegExp(`\\|\\|${MESSAGE_TAG}(${B64})\\|\\|`);
const KEY_RE = new RegExp(`\\|\\|${KEY_TAG}(${B64})\\|\\|`);

export const findEncrypted = (content: string | undefined) => content?.match(MESSAGE_RE)?.[1] ?? null;
export const findPublicKey = (content: string | undefined) => {
    const key = content?.match(KEY_RE)?.[1];
    return key && fromBase64(key).length === 32 ? key : null;
};

/** How many characters of text fit into one encrypted message */
export function fitsInOneMessage(text: string) {
    const bytes = encoder.encode(text).length + 12 + 16;
    return `🔒 ||${MESSAGE_TAG}||`.length + Math.ceil(bytes / 3) * 4 <= MAX_CONTENT;
}

/** 20 digits both people see the same when nobody swapped the keys; they can compare them by voice */
export async function safetyCode(publicA: string, publicB: string) {
    const [first, second] = [publicA, publicB].sort();
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`${first}|${second}`)));
    let n = 0n;
    for (const b of hash.subarray(0, 12)) n = (n << 8n) | BigInt(b);
    return (n % 10n ** 20n).toString().padStart(20, "0").match(/.{5}/g)!.join(" ");
}
