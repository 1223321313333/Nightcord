/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure Content-Security-Policy logic, with no Electron or settings dependencies, so it can be unit tested.
// The Electron wiring (intercepting responses, reading settings) lives in index.ts.

export type PolicyMap = Record<string, string[]>;

export const ConnectSrc = ["connect-src"];
export const ImageSrc = [...ConnectSrc, "img-src"];
export const CssSrc = ["style-src", "font-src"];
export const ImageAndMediaSrc = [...ImageSrc, "media-src"];
export const ImageAndCssSrc = [...ImageSrc, ...CssSrc];
export const ImageScriptsAndCssSrc = [...ImageAndCssSrc, "script-src", "worker-src"];
export const CSPSrc = ["style-src", "connect-src", "img-src", "frame-src", "font-src", "media-src", "worker-src"];

// Plugins can whitelist their own domains by importing this object in their native.ts
// script and just adding to it. But generally, you should just edit this file instead

export const CspPolicies: PolicyMap = {
    "http://localhost:*": ImageAndCssSrc,
    "http://127.0.0.1:*": ImageAndCssSrc,
    "localhost:*": ImageAndCssSrc,
    "127.0.0.1:*": ImageAndCssSrc,

    "*.github.io": ImageAndCssSrc, // GitHub pages, used by most themes
    "github.com": ImageAndCssSrc, // GitHub content (stuff uploaded to markdown forms), used by most themes
    "raw.githubusercontent.com": ImageAndCssSrc, // GitHub raw, used by some themes
    "*.gitlab.io": ImageAndCssSrc, // GitLab pages, used by some themes
    "gitlab.com": ImageAndCssSrc, // GitLab raw, used by some themes
    "*.codeberg.page": ImageAndCssSrc, // Codeberg pages, used by some themes
    "codeberg.org": ImageAndCssSrc, // Codeberg raw, used by some themes

    "*.githack.com": ImageAndCssSrc, // githack (namely raw.githack.com), used by some themes
    "jsdelivr.net": ImageAndCssSrc, // jsDelivr, used by very few themes

    "fonts.googleapis.com": CssSrc, // Google Fonts, used by many themes
    "fonts.gstatic.com": ["font-src"], // the font files Google Fonts stylesheets point to

    "i.imgur.com": ImageSrc, // Imgur, used by some themes
    "i.ibb.co": ImageSrc, // ImgBB, used by some themes
    "i.pinimg.com": ImageSrc, // Pinterest, used by some themes
    "files.catbox.moe": ImageAndCssSrc, // Catbox, used by some themes

    "cdn.discordapp.com": ImageAndCssSrc, // Discord CDN, used by Nightcord and some themes to load media
    "media.discordapp.net": ImageSrc, // Discord media CDN, possible alternative to Discord CDN

    // CDNs used for some things by Nightcord.
    // FIXME: we really should not be using CDNs anymore
    "cdnjs.cloudflare.com": ImageScriptsAndCssSrc,
    "cdn.jsdelivr.net": ImageScriptsAndCssSrc,

    // Function Specific
    "api.github.com": ConnectSrc, // used for updating Nightcord itself
    "ws.audioscrobbler.com": ConnectSrc, // Last.fm API
    "musicbrainz.org": ConnectSrc,
    "*.listenbrainz.org": ConnectSrc,
    "coverartarchive.org": ConnectSrc,
    "archive.org": ConnectSrc,
    "*.archive.org": ConnectSrc,
    "translate-pa.googleapis.com": ConnectSrc, // Google Translate API
    "*.vencord.dev": ImageSrc, // VenCloud (api.vencord.dev) and Badges (badges.vencord.dev)
    "manti.vendicated.dev": ImageSrc, // ReviewDB API
    "decor.fieryflames.dev": ConnectSrc, // Decor API
    "ugc.decor.fieryflames.dev": ImageSrc, // Decor CDN
    "sponsor.ajay.app": ConnectSrc, // Dearrow API
    "dearrow-thumb.ajay.app": ImageSrc, // Dearrow Thumbnail CDN
    "usrbg.is-hardly.online": ImageSrc, // USRBG API
    "icons.duckduckgo.com": ImageSrc, // DuckDuckGo Favicon API (Reverse Image Search)

    // Tenor & Giphy, used by GifProviderSwitcher plugin and some themes
    "*.tenor.com": ImageAndMediaSrc,
    "*.tenor.co": ImageAndMediaSrc,
    "*.giphy.com": ImageAndMediaSrc,
};

export const findHeader = (headers: PolicyMap, headerName: Lowercase<string>) => {
    return Object.keys(headers).find(h => h.toLowerCase() === headerName);
};

export const parsePolicy = (policy: string): PolicyMap => {
    const result: PolicyMap = {};
    policy.split(";").forEach(directive => {
        const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
        if (directiveKey && !Object.prototype.hasOwnProperty.call(result, directiveKey)) {
            result[directiveKey] = directiveValue;
        }
    });

    return result;
};

export const stringifyPolicy = (policy: PolicyMap): string =>
    Object.entries(policy)
        .filter(([, values]) => values?.length)
        .map(directive => directive.flat().join(" "))
        .join("; ");

/**
 * Whether a user-requested CSP override is safe to add (see csp/manager.ts). The URL must parse and its host
 * must not contain characters that could break out of the policy string, and the directives must be a
 * non-empty subset of the image/css/font/connect sources — never script-src, so an override can load media
 * but never run code.
 */
export function validateCspOverride(url: string, directives: string[]): boolean {
    try {
        const { host } = new URL(url);

        if (/[;'"\\]/.test(host)) return false;
    } catch {
        return false;
    }

    if (directives.length === 0) return false;
    if (directives.some(d => !ImageAndCssSrc.includes(d))) return false;

    return true;
}

/**
 * Whether `url`'s host is already allowed for every one of `directives` by the curated allowlist or the
 * user's own overrides (see csp/manager.ts). False when the URL does not parse or the host has no rule.
 */
export function isDomainAllowedBy(url: string, directives: string[], policies: PolicyMap, customCspRules: PolicyMap): boolean {
    try {
        const { host } = new URL(url);

        const ruleForDomain = policies[host] ?? customCspRules[host];
        if (!ruleForDomain) return false;

        return directives.every(d => ruleForDomain.includes(d));
    } catch {
        return false;
    }
}

export interface BuildCspOptions {
    /** Strict connections: leave out the "*" rule so the window can only reach the listed servers */
    strict: boolean;
    /** User-added per-domain overrides (always applied, even in strict mode) */
    customCspRules: PolicyMap;
    /** Hosts that plugin code mentions; kept reachable in strict mode so plugins keep working */
    pluginHosts: readonly string[];
}

/**
 * Adds Nightcord's rules to a parsed Discord CSP: inline/eval for Discord's own code, the blob:/data:/app
 * schemes, user overrides, the curated host allowlist, and — in strict mode — every plugin host while leaving
 * out the "*" rule. Mutates and returns `csp`.
 */
export function buildCsp(csp: PolicyMap, { strict, customCspRules, pluginHosts }: BuildCspOptions): PolicyMap {
    const pushDirective = (directive: string, ...values: string[]) => {
        csp[directive] ??= [...(csp["default-src"] ?? [])];
        csp[directive].push(...values);
    };

    pushDirective("style-src", "'unsafe-inline'");
    // we could make unsafe-inline safe by using strict-dynamic with a random nonce on our Nightcord loader script https://content-security-policy.com/strict-dynamic/
    // HOWEVER, at the time of writing (24 Jan 2025), Discord is INSANE and also uses unsafe-inline
    // Once they stop using it, we also should
    pushDirective("script-src", "'unsafe-inline'", "'unsafe-eval'");

    for (const directive of ["style-src", "connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
        pushDirective(directive, "blob:", "data:", "vencord:", "vesktop:", "nightcord:", "equibop:");
    }

    for (const [host, directives] of Object.entries(customCspRules)) {
        for (const directive of directives) {
            pushDirective(directive, host);
        }
    }

    // Nightcord: in strict mode the "*" rule (added by NightcordHelper) is left out, so the window can only
    // reach Discord and the servers listed here, and cannot quietly send data anywhere else
    for (const [host, directives] of Object.entries(CspPolicies)) {
        if (strict && host === "*") continue;
        for (const directive of directives) {
            pushDirective(directive, host);
        }
    }
    // ...but every server that plugin code mentions stays reachable, so plugins keep working (no scripts or frames)
    if (strict) {
        for (const directive of ["connect-src", "img-src", "media-src", "style-src", "font-src"]) {
            pushDirective(directive, ...pluginHosts);
        }
    }

    return csp;
}
