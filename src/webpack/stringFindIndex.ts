/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Finds which of many literal strings occur in a module's source in a single pass.
 *
 * Every Discord module (~15k, ~31MB of code) has to be checked against every string patch find
 * (several hundred with many plugins enabled). One big regex alternation costs ~25ns per character
 * and still needs includes() per find afterwards; this rolling hash (multi-pattern Rabin-Karp) looks
 * at each position once, checks a bitmap of the hashed first WINDOW characters of every find and only
 * compares strings on a hit, so it finds all present finds, overlapping ones included, in one scan.
 */

const WINDOW = 6;
const BASE = 0x01000193;
const BITMAP_BITS = 20;

// BASE^(WINDOW - 1) mod 2^32, used to remove the outgoing character from the rolling hash
const OUTGOING_FACTOR = (() => {
    let p = 1;
    for (let i = 0; i < WINDOW - 1; i++) p = Math.imul(p, BASE);
    return p;
})();

function hashWindow(str: string, start: number) {
    let h = 0;
    for (let i = start; i < start + WINDOW; i++) h = (Math.imul(h, BASE) + str.charCodeAt(i)) | 0;
    return h;
}

export class StringFindIndex {
    readonly finds: ReadonlySet<string>;
    private readonly bitmap = new Uint32Array((1 << BITMAP_BITS) >>> 5);
    private readonly buckets = new Map<number, string[]>();
    /** Finds shorter than the window, checked with includes() */
    private readonly short: string[] = [];

    constructor(finds: Iterable<string>) {
        this.finds = new Set(finds);

        for (const find of this.finds) {
            if (find.length < WINDOW) {
                this.short.push(find);
                continue;
            }

            const h = hashWindow(find, 0);
            const bit = h >>> (32 - BITMAP_BITS);
            this.bitmap[bit >>> 5] |= 1 << (bit & 31);

            const bucket = this.buckets.get(h);
            if (bucket) bucket.push(find);
            else this.buckets.set(h, [find]);
        }
    }

    /** The finds that occur in code, or null if none do */
    match(source: string): Set<string> | null {
        let found: Set<string> | null = null;

        for (const find of this.short) {
            if (source.includes(find)) (found ??= new Set()).add(find);
        }

        const last = source.length - WINDOW;
        if (last < 0 || this.buckets.size === 0) return found;

        // Factory sources are slices of Discord's huge external script strings, where every charCodeAt goes through
        // extra indirection. Copying into a flat string first is cheap (~0.5ns/char) and makes the scan ~1.5x faster.
        const code = (" " + source).slice(1);
        const { bitmap, buckets } = this;
        let h = hashWindow(code, 0);

        for (let i = 0; ; i++) {
            const bit = h >>> (32 - BITMAP_BITS);
            if ((bitmap[bit >>> 5] & (1 << (bit & 31))) !== 0) {
                const bucket = buckets.get(h);
                if (bucket !== undefined) {
                    for (const find of bucket) {
                        if (code.startsWith(find, i)) (found ??= new Set()).add(find);
                    }
                }
            }

            if (i === last) break;
            h = (Math.imul((h - Math.imul(code.charCodeAt(i), OUTGOING_FACTOR)) | 0, BASE) + code.charCodeAt(i + WINDOW)) | 0;
        }

        return found;
    }
}
