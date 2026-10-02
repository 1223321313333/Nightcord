/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Finds links that pretend to be Discord or Steam so the account-stealing scams common in Russian servers
// ("бесплатный Nitro", "подарок в Steam") can be flagged before someone clicks. This is pure, no imports, so the
// tests can run it directly. It only looks at the text; it never opens the link or contacts anything.

export type ScamReason =
    /** Almost the real address but misspelled: dlscord.com, disc0rd.com, discord.gq */
    | "typosquat"
    /** Uses a brand name but is not the brand's real domain: discord-nitro.com, discord.ru */
    | "impersonation"
    /** The link text shows one site but the link really goes to another */
    | "masked";

export interface ScamHit {
    /** The real host the link goes to */
    host: string;
    reason: ScamReason;
    /** For "masked": the host shown in the link text, which differs from `host` */
    shownAs?: string;
}

// Real registrable domains that are safe even though they contain a brand name.
const OFFICIAL = new Set([
    "discord.com", "discordapp.com", "discordapp.net", "discord.gg", "discord.gift",
    "discord.new", "discord.media", "discord.dev", "discord.co", "discordstatus.com",
    "steamcommunity.com", "steampowered.com", "steamgames.com", "steamstatic.com", "valvesoftware.com"
]);

// Brand words (all at least 7 long, so short accidental matches do not count).
const BRANDS = ["discordapp", "discord", "steamcommunity", "steampowered"];

// Words scammers add around a brand. A brand plus one of these, or a brand with a hyphen, is almost always a scam.
const BAIT = [
    "nitro", "gift", "free", "claim", "login", "logln", "verify", "gratis", "promo", "airdrop",
    "bonus", "giveaway", "give", "redeem", "reward", "unlock", "official", "support", "account",
    "steamgift", "csgo", "skins", "boost", "premium"
];

const URL_RE = /\bhttps?:\/\/[^\s<>"'`\])]+/gi;
const MASKED_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/gi;
// A bare domain inside link text, e.g. the "discord.com/nitro" a masked link shows
const BARE_HOST_RE = /(?:https?:\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i;

/** True when `a` is one edit away from `b`: a single insert, delete, substitution or swap of neighbours. */
function within1(a: string, b: string): boolean {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    // same length: one substitution, or one swap of two neighbouring letters (discrod -> discord)
    if (la === lb) {
        const diff: number[] = [];
        for (let i = 0; i < la; i++) if (a[i] !== b[i]) diff.push(i);
        if (diff.length === 1) return true;
        if (diff.length === 2 && diff[1] === diff[0] + 1) {
            return a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
        }
        return false;
    }
    // one insertion/deletion: the shorter must be the longer with one char removed
    const [short, long] = la < lb ? [a, b] : [b, a];
    let i = 0, j = 0, skipped = false;
    while (i < short.length && j < long.length) {
        if (short[i] === long[j]) { i++; j++; continue; }
        if (skipped) return false;
        skipped = true;
        j++;
    }
    return true;
}

/** Hostname of a URL, lower-cased, without a port, "www." or a trailing dot. null if it is not a real web host. */
export function hostOf(url: string): string | null {
    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        return null;
    }
    host = host.replace(/\.$/, "");
    if (host.startsWith("www.")) host = host.slice(4);
    // IP addresses and single-label hosts (localhost) are out of scope here
    if (!host.includes(".") || /^[\d.]+$/.test(host) || host.endsWith("]")) return null;
    return host;
}

/** Last two labels, e.g. "a.b.discord-nitro.com" -> "discord-nitro.com". */
function registrable(host: string): string {
    const parts = host.split(".");
    return parts.slice(-2).join(".");
}

function classifyHost(host: string): ScamReason | null {
    const reg = registrable(host);
    if (OFFICIAL.has(reg)) return null;

    const sld = reg.split(".")[0]; // second-level label, e.g. "discord-nitro"
    const labels = host.split(".");

    for (const brand of BRANDS) {
        // Exactly the brand on a wrong domain: discord.ru, discordapp.io, steamcommunity.net
        if (sld === brand) return "impersonation";
        // Brand mixed into the second-level label with bait or a hyphen: discord-nitro.com, discordgift.xyz
        if (sld.includes(brand) && sld !== brand) {
            if (sld.includes("-") || BAIT.some(w => sld.includes(w))) return "impersonation";
        }
        // Brand as its own label in front of a junk domain: discord.com-verify.ru, steamcommunity.gift-cs.top
        if (labels.includes(brand) && (reg.includes("-") || BAIT.some(w => reg.includes(w)))) return "impersonation";
    }

    // A near-miss of a real domain: dlscord.com, disc0rd.gg, steamcomunity.com, discord.gq
    for (const official of OFFICIAL) {
        if (within1(reg, official)) return "typosquat";
    }
    return null;
}

/**
 * Scans a message's text for links that imitate Discord or Steam. Returns at most a few hits, one per host.
 * Low false positives by design: it only warns about look-alikes of a short list of well-known brands.
 */
export function scanForScams(text: string): ScamHit[] {
    if (!text || typeof text !== "string") return [];
    const hits = new Map<string, ScamHit>();
    const add = (hit: ScamHit) => { if (!hits.has(hit.host)) hits.set(hit.host, hit); };

    // Masked links: the text shows one host, the link goes to another
    for (const m of text.matchAll(MASKED_RE)) {
        const realHost = hostOf(m[2]);
        if (!realHost) continue;
        const shownHost = hostOf(m[1].trim()) ?? BARE_HOST_RE.exec(m[1])?.[1]?.toLowerCase().replace(/^www\./, "") ?? null;
        if (shownHost && shownHost.includes(".") && registrable(shownHost) !== registrable(realHost)) {
            add({ host: realHost, reason: "masked", shownAs: shownHost });
        }
    }

    // Every plain link
    for (const m of text.matchAll(URL_RE)) {
        const raw = m[0].replace(/[.,!?;:)]+$/, "");
        const host = hostOf(raw);
        if (!host || hits.has(host)) continue;
        const reason = classifyHost(host);
        if (reason) add({ host, reason });
    }

    return [...hits.values()].slice(0, 4);
}
