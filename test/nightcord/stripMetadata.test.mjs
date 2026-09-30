/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// StripMetadata: builds realistic files with location, camera and text metadata and checks what is left

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { crc32 } from "node:zlib";

import { BASE_JPG, BASE_PNG } from "./fixtures.mjs";
import { be32, has, le16, le32, load, u8 } from "./helpers.mjs";

let stripMetadata;
before(async () => ({ stripMetadata } = await load("src/nightcordplugins/stripMetadata/strip.ts")));

const ALL = { images: true, videos: true };
const run = async (bytes, opts = ALL, type = "") => {
    const r = await stripMetadata(new Blob([bytes], { type }), opts);
    return r && { removed: r.removed, out: new Uint8Array(await r.blob.arrayBuffer()) };
};

/** EXIF (little-endian TIFF): camera make, orientation 6 and a GPS block with Moscow coordinates */
function exifTiff() {
    const make = "CanonTestCam\0";
    const makeOff = 50, gpsOff = 64, gpsEntries = 4;
    const ratOff = gpsOff + 2 + gpsEntries * 12 + 4;
    const rat = (a, b) => [...le32(a), ...le32(b)];
    return u8(
        "II", le16(42), le32(8),
        le16(3),
        le16(0x010f), le16(2), le32(make.length), le32(makeOff),
        le16(0x0112), le16(3), le32(1), le16(6), le16(0),
        le16(0x8825), le16(4), le32(1), le32(gpsOff),
        le32(0),
        make, [0],
        le16(gpsEntries),
        le16(0x0001), le16(2), le32(2), [78, 0, 0, 0],
        le16(0x0002), le16(5), le32(3), le32(ratOff),
        le16(0x0003), le16(2), le32(2), [69, 0, 0, 0],
        le16(0x0004), le16(5), le32(3), le32(ratOff + 24),
        le32(0),
        rat(55, 1), rat(45, 1), rat(2088, 100),
        rat(37, 1), rat(37, 1), rat(218, 10)
    );
}
const segment = (marker, payload) => u8([0xff, marker], [(payload.length + 2) >> 8, (payload.length + 2) & 255], payload);

describe("JPEG", () => {
    const app0End = 4 + ((BASE_JPG[4] << 8) | BASE_JPG[5]);
    const jpg = u8(
        BASE_JPG.subarray(0, app0End),
        segment(0xe1, u8("Exif\0\0", exifTiff())),
        segment(0xe1, u8("http://ns.adobe.com/xap/1.0/\0", "<x:xmpmeta><exif:GPSLatitude>55,45.348N</exif:GPSLatitude></x:xmpmeta>")),
        segment(0xfe, u8("Taken at home, Tverskaya 7")),
        BASE_JPG.subarray(app0End)
    );

    it("removes location, camera, XMP and comments", async () => {
        const { removed, out } = await run(jpg, ALL, "image/jpeg");
        for (const kind of ["location", "camera", "xmp", "comment"]) assert.ok(removed.has(kind), kind);
        assert.ok(!has(out, "CanonTestCam") && !has(out, "xmpmeta") && !has(out, "Tverskaya"));
        assert.ok(!has(out, [...le32(2088), ...le32(100)]), "GPS numbers are gone");
    });

    it("keeps JFIF first, only the orientation, and the image data as is", async () => {
        const { out } = await run(jpg);
        assert.deepEqual([out[2], out[3]], [0xff, 0xe0]);
        const exifAt = Buffer.from(out).indexOf("Exif\0\0");
        assert.ok(exifAt > 0);
        assert.deepEqual([out[exifAt - 4], out[exifAt - 3]], [0xff, 0xe1]);
        assert.equal(out[exifAt + 6 + 8 + 2 + 8], 0);
        assert.equal(out[exifAt + 6 + 8 + 2 + 9], 6, "orientation 6 kept");
        const data = Buffer.from(BASE_JPG.subarray(app0End));
        assert.ok(Buffer.from(out).subarray(out.length - data.length).equals(data));
    });

    it("leaves clean, broken and switched-off files alone", async () => {
        assert.equal(await run(BASE_JPG), null);
        assert.equal(await run(jpg, { images: false, videos: true }), null);
        assert.equal(await run(u8([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff], "x")), null);
        assert.equal(await run(u8("hello world, not an image")), null);
    });
});

describe("PNG", () => {
    const chunk = (type, data) => { const td = u8(type, data); return u8(be32(data.length), td, be32(crc32(td) >>> 0)); };
    const iend = BASE_PNG.length - 12;
    const png = u8(
        BASE_PNG.subarray(0, iend),
        chunk("tEXt", u8("Comment\0GPS 55.7558 37.6173")),
        chunk("tIME", [7, 234, 9, 29, 12, 0, 0]),
        chunk("iTXt", u8("Author\0\0\0\0\0Ivan Ivanov")),
        BASE_PNG.subarray(iend)
    );

    it("removes text and time and gives back the original image", async () => {
        const { removed, out } = await run(png);
        assert.ok(removed.has("text") && removed.has("time"));
        assert.ok(!has(out, "55.7558") && !has(out, "Ivan Ivanov"));
        assert.ok(Buffer.from(out).equals(Buffer.from(BASE_PNG)));
    });
});

describe("WebP", () => {
    const tiny = Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64");
    const exif = exifTiff();
    const body = u8("WEBP", "VP8X", le32(10), [0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0], new Uint8Array(tiny.subarray(12)), "EXIF", le32(exif.length), exif, exif.length & 1 ? [0] : []);
    const webp = u8("RIFF", le32(body.length), body);

    it("removes EXIF, clears its flag and fixes the RIFF size", async () => {
        const { removed, out } = await run(webp);
        assert.ok(removed.has("exif"));
        assert.ok(!has(out, "EXIF") && !has(out, "CanonTestCam"));
        assert.equal(out[20] & 0x08, 0);
        assert.equal(new DataView(out.buffer).getUint32(4, true), out.length - 8);
    });
});

describe("MP4 / MOV", () => {
    const box = (type, ...payload) => { const b = u8(...payload); return u8(be32(8 + b.length), type, b); };
    const keys = ["com.apple.quicktime.location.ISO6709", "com.apple.quicktime.make", "com.apple.quicktime.title"];
    const keysBox = box("keys", [0, 0, 0, 0], be32(keys.length), ...keys.map(k => u8(be32(8 + k.length), "mdta", k)));
    const dataBox = v => box("data", be32(1), be32(0), v);
    const ilst = box("ilst", box(u8(be32(1)), dataBox("+55.7558+037.6173+144.000/")), box(u8(be32(2)), dataBox("Apple")), box(u8(be32(3)), dataBox("Holiday video")));
    const moov = box("moov", box("mvhd", new Uint8Array(100)), box("udta", box(u8([0xa9, 0x78, 0x79, 0x7a]), [0, 17, 0x15, 0xc7], "+55.7558+037.6173/")), box("meta", box("hdlr", new Uint8Array(24)), keysBox, ilst));
    const ftyp = box("ftyp", "qt  ", be32(0), "qt  ");
    const mdat = box("mdat", new Uint8Array(4096).fill(7));
    const mov = u8(ftyp, mdat, moov);

    it("blanks location and device model in place", async () => {
        const { removed, out } = await run(mov, ALL, "video/quicktime");
        assert.ok(removed.has("location") && removed.has("camera"));
        assert.ok(!has(out, "55.7558") && !has(out, "037.6173"));
        assert.ok(!has(out, "Apple") && has(out, "Holiday video"), "other metadata kept");
        assert.ok(has(out, "free") && !has(out, [0xa9, 0x78, 0x79, 0x7a]), "©xyz became free space");
        assert.ok(has(out, "com.apple.quicktime.location.ISO6709"), "keys still name the entries");
    });

    it("keeps the size and the video data", async () => {
        const { out } = await run(mov);
        assert.equal(out.length, mov.length);
        assert.ok(Buffer.from(out).subarray(ftyp.length, ftyp.length + mdat.length).equals(Buffer.from(mdat)));
    });
});
