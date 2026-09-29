/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Removes privacy-sensitive metadata from files before they are uploaded.
// Works on the bytes directly, nothing is re-encoded, so image and video quality stay the same.
//
// JPEG: EXIF (GPS, camera, dates), XMP, IPTC and comments are dropped. If the photo has an EXIF rotation,
//       a minimal EXIF with only that tag is written back so it is not displayed sideways.
// PNG:  text chunks (tEXt, zTXt, iTXt), eXIf and tIME are dropped.
// WebP: EXIF and XMP chunks are dropped and the VP8X flags updated.
// MP4/MOV: location (©xyz, loci, com.apple.quicktime.location.*) and device make/model in the moov box are
//       overwritten in place, so no offsets inside the video change. Only the moov box is read, not the video.

export type Removed = "location" | "camera" | "exif" | "xmp" | "iptc" | "comment" | "text" | "time";

export interface StripResult {
    blob: Blob;
    removed: Set<Removed>;
}

const MAX_IMAGE = 64 * 1024 * 1024;
const MAX_MOOV = 64 * 1024 * 1024;

const ascii = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        offset += p.length;
    }
    return out;
}

/* ---------------------------------- JPEG ---------------------------------- */

interface ExifInfo { orientation: number | null; gps: boolean; camera: boolean; }

/** Reads the orientation and whether GPS or camera tags exist from an EXIF TIFF block */
function readExif(tiff: Uint8Array): ExifInfo {
    const info: ExifInfo = { orientation: null, gps: false, camera: false };
    if (tiff.length < 8) return info;
    const little = tiff[0] === 0x49 && tiff[1] === 0x49;
    if (!little && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return info;
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    const u16 = (o: number) => view.getUint16(o, little);
    const u32 = (o: number) => view.getUint32(o, little);
    if (u16(2) !== 42) return info;

    const ifd = u32(4);
    if (ifd + 2 > tiff.length) return info;
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > tiff.length) break;
        const tag = u16(entry);
        if (tag === 0x0112) info.orientation = u16(entry + 8);
        else if (tag === 0x8825) info.gps = true;
        else if (tag === 0x010f || tag === 0x0110) info.camera = true;
    }
    return info;
}

/** APP1 segment with an EXIF block that only holds the orientation */
function orientationSegment(orientation: number) {
    return new Uint8Array([
        0xff, 0xe1, 0x00, 0x22, // APP1, length 34
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
        0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF header, IFD0 at 8
        0x00, 0x01, // one entry
        0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, orientation >> 8, orientation & 0xff, 0x00, 0x00, // Orientation SHORT
        0x00, 0x00, 0x00, 0x00 // no next IFD
    ]);
}

export function stripJpeg(bytes: Uint8Array): { bytes: Uint8Array<ArrayBuffer>; removed: Set<Removed>; } | null {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    const removed = new Set<Removed>();
    const parts: Uint8Array[] = [];
    let orientation: number | null = null;
    let i = 2;

    while (i + 4 <= bytes.length) {
        if (bytes[i] !== 0xff) return null; // not where a marker should be: leave the file alone
        const marker = bytes[i + 1];
        if (marker === 0xff) { i++; continue; } // fill byte
        // Start of scan or end of image: the rest is image data
        if (marker === 0xda || marker === 0xd9) {
            parts.push(bytes.subarray(i));
            i = bytes.length;
            break;
        }
        if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
            parts.push(bytes.subarray(i, i + 2));
            i += 2;
            continue;
        }

        const length = (bytes[i + 2] << 8) | bytes[i + 3];
        const end = i + 2 + length;
        if (length < 2 || end > bytes.length) return null;
        const payload = bytes.subarray(i + 4, end);

        if (marker === 0xe1) {
            if (ascii(payload, 0, 6) === "Exif\0\0") {
                const exif = readExif(payload.subarray(6));
                orientation ??= exif.orientation;
                removed.add("exif");
                if (exif.gps) removed.add("location");
                if (exif.camera) removed.add("camera");
            } else {
                removed.add("xmp");
            }
        } else if (marker === 0xed) {
            removed.add("iptc");
        } else if (marker === 0xfe) {
            removed.add("comment");
        } else {
            parts.push(bytes.subarray(i, end));
        }
        i = end;
    }

    if (!removed.size) return null;
    const head = [bytes.subarray(0, 2)];
    // JFIF requires its APP0 right after SOI, so the orientation goes after it
    if (parts[0]?.[1] === 0xe0) head.push(parts.shift()!);
    if (orientation != null && orientation > 1 && orientation <= 8) head.push(orientationSegment(orientation));
    return { bytes: concat([...head, ...parts]), removed };
}

/* ---------------------------------- PNG ----------------------------------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_DROP: Record<string, Removed> = { tEXt: "text", zTXt: "text", iTXt: "text", eXIf: "exif", tIME: "time" };

export function stripPng(bytes: Uint8Array): { bytes: Uint8Array<ArrayBuffer>; removed: Set<Removed>; } | null {
    if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const removed = new Set<Removed>();
    const parts: Uint8Array[] = [bytes.subarray(0, 8)];
    let i = 8;

    while (i + 12 <= bytes.length) {
        const length = view.getUint32(i);
        const type = ascii(bytes, i + 4, 4);
        const end = i + 12 + length;
        if (end > bytes.length) return null;
        if (PNG_DROP[type]) removed.add(PNG_DROP[type]);
        else parts.push(bytes.subarray(i, end));
        i = end;
        if (type === "IEND") break;
    }

    if (!removed.size) return null;
    return { bytes: concat(parts), removed };
}

/* ---------------------------------- WebP ---------------------------------- */

export function stripWebp(bytes: Uint8Array): { bytes: Uint8Array<ArrayBuffer>; removed: Set<Removed>; } | null {
    if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const removed = new Set<Removed>();
    const chunks: Uint8Array[] = [];
    let i = 12;

    while (i + 8 <= bytes.length) {
        const type = ascii(bytes, i, 4);
        const size = view.getUint32(i + 4, true);
        const end = i + 8 + size + (size & 1);
        if (i + 8 + size > bytes.length) return null;
        if (type === "EXIF") removed.add("exif");
        else if (type === "XMP ") removed.add("xmp");
        else chunks.push(bytes.subarray(i, Math.min(end, bytes.length)));
        i = end;
    }

    if (!removed.size) return null;
    const body = concat(chunks);
    // VP8X flags: clear the EXIF (0x08) and XMP (0x04) bits
    if (ascii(body, 0, 4) === "VP8X") body[8] &= ~0x0c;
    const header = new Uint8Array(12);
    header.set(bytes.subarray(0, 12));
    new DataView(header.buffer).setUint32(4, body.length + 4, true);
    return { bytes: concat([header, body]), removed };
}

/* -------------------------------- MP4 / MOV ------------------------------- */

const CONTAINERS = new Set(["moov", "udta", "trak", "meta", "mdia", "minf"]);
const LOCATION_BOXES = new Set(["©xyz", "loci"]);
const CAMERA_BOXES = new Set(["©mak", "©mod"]);

function boxSize(view: DataView, offset: number, end: number) {
    let size = view.getUint32(offset);
    let header = 8;
    if (size === 1) {
        size = Number(view.getBigUint64(offset + 8));
        header = 16;
    } else if (size === 0) {
        size = end - offset;
    }
    return { size, header };
}

/** Overwrites a box in place with a "free" box of the same size */
function blank(moov: Uint8Array, offset: number, size: number, header: number) {
    moov.fill(0, offset + header, offset + size);
    moov.set([0x66, 0x72, 0x65, 0x65], offset + 4); // "free"
}

/** Walks the boxes in moov and blanks location and camera metadata. Sizes never change. */
export function stripMoov(moov: Uint8Array): Set<Removed> {
    const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
    const removed = new Set<Removed>();

    function walk(start: number, end: number) {
        let i = start;
        while (i + 8 <= end) {
            const { size, header } = boxSize(view, i, end);
            if (size < header || i + size > end) return;
            const type = ascii(moov, i + 4, 4);

            if (LOCATION_BOXES.has(type)) {
                blank(moov, i, size, header);
                removed.add("location");
            } else if (CAMERA_BOXES.has(type)) {
                blank(moov, i, size, header);
                removed.add("camera");
            } else if (type === "meta") {
                // ISO "meta" is a full box (4 bytes of version and flags), QuickTime "meta" is not
                const isQuickTime = ascii(moov, i + header + 4, 4) === "hdlr";
                const childStart = i + header + (isQuickTime ? 0 : 4);
                stripKeyedMetadata(childStart, i + size);
                walk(childStart, i + size);
            } else if (CONTAINERS.has(type)) {
                walk(i + header, i + size);
            }
            i += size;
        }
    }

    /** QuickTime metadata: 'keys' names the entries, 'ilst' holds their values by 1-based index */
    function stripKeyedMetadata(start: number, end: number) {
        const sensitive = new Map<number, Removed>();
        let ilst: { offset: number; size: number; header: number; } | null = null;

        let i = start;
        while (i + 8 <= end) {
            const { size, header } = boxSize(view, i, end);
            if (size < header || i + size > end) return;
            const type = ascii(moov, i + 4, 4);
            if (type === "keys") {
                const count = view.getUint32(i + header + 4);
                let k = i + header + 8;
                for (let index = 1; index <= count && k + 8 <= i + size; index++) {
                    const keySize = view.getUint32(k);
                    if (keySize < 8) break;
                    const key = ascii(moov, k + 8, keySize - 8);
                    if (/location/i.test(key)) sensitive.set(index, "location");
                    else if (/\.(make|model|software)$/i.test(key)) sensitive.set(index, "camera");
                    k += keySize;
                }
            } else if (type === "ilst") {
                ilst = { offset: i, size, header };
            }
            i += size;
        }

        if (!ilst || !sensitive.size) return;
        let j = ilst.offset + ilst.header;
        const ilstEnd = ilst.offset + ilst.size;
        while (j + 8 <= ilstEnd) {
            const { size, header } = boxSize(view, j, ilstEnd);
            if (size < header || j + size > ilstEnd) return;
            const kind = sensitive.get(view.getUint32(j + 4));
            if (kind) {
                // keep every box header, zero only the values of the item's 'data' boxes
                let d = j + header;
                while (d + 16 <= j + size) {
                    const data = boxSize(view, d, j + size);
                    if (data.size < data.header || d + data.size > j + size) break;
                    if (ascii(moov, d + 4, 4) === "data") moov.fill(0, d + data.header + 8, d + data.size);
                    d += data.size;
                }
                removed.add(kind);
            }
            j += size;
        }
    }

    walk(0, moov.length);
    return removed;
}

async function readRange(blob: Blob, start: number, end: number) {
    return new Uint8Array(await blob.slice(start, end).arrayBuffer());
}

async function stripVideo(file: Blob): Promise<StripResult | null> {
    const head = await readRange(file, 0, 12);
    if (ascii(head, 4, 4) !== "ftyp") return null;

    // find the moov box among the top-level boxes without reading the video data
    let offset = 0;
    while (offset + 8 <= file.size) {
        const h = await readRange(file, offset, offset + 16);
        const view = new DataView(h.buffer);
        const { size, header } = boxSize(view, 0, file.size - offset);
        if (size < header) return null;
        if (ascii(h, 4, 4) === "moov") {
            if (size > MAX_MOOV) return null;
            const moov = await readRange(file, offset, offset + size);
            const removed = stripMoov(moov.subarray(header));
            if (!removed.size) return null;
            return {
                blob: new Blob([file.slice(0, offset), moov, file.slice(offset + size)], { type: file.type }),
                removed
            };
        }
        offset += size;
    }
    return null;
}

/* ---------------------------------- entry --------------------------------- */

export interface StripOptions {
    images: boolean;
    videos: boolean;
}

/** A copy of the file without sensitive metadata, or null when there is nothing to remove */
export async function stripMetadata(file: Blob, options: StripOptions): Promise<StripResult | null> {
    if (file.size < 16) return null;
    const head = await readRange(file, 0, 12);

    const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const isPng = PNG_SIGNATURE.every((b, i) => head[i] === b);
    const isWebp = ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP";

    if (isJpeg || isPng || isWebp) {
        if (!options.images || file.size > MAX_IMAGE) return null;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = isJpeg ? stripJpeg(bytes) : isPng ? stripPng(bytes) : stripWebp(bytes);
        return result && { blob: new Blob([result.bytes], { type: file.type }), removed: result.removed };
    }

    if (options.videos && ascii(head, 4, 4) === "ftyp") return stripVideo(file);
    return null;
}
