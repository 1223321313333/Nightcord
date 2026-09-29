/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Implements the zip-local API used by scripts/build/buildWeb.mjs:
//   Zip.zip(dir, (err, zipped) => zipped.compress().save(file))
// with fflate (already a Nightcord dependency) instead of jszip 2.x.
// Wired in through `overrides` in pnpm-workspace.yaml so Equicord's files stay untouched.

const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const { zipSync } = require("fflate");

function collect(dir, prefix, out) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        const name = prefix + entry.name;
        if (entry.isDirectory()) collect(full, name + "/", out);
        else if (entry.isFile()) out[name] = readFileSync(full);
    }
    return out;
}

function zip(dir, callback) {
    let files;
    try {
        files = collect(dir, "", {});
    } catch (err) {
        callback(err);
        return;
    }

    let level = 0;
    const zipped = {
        compress() {
            level = 9;
            return zipped;
        },
        memory() {
            return Buffer.from(zipSync(files, { level }));
        },
        save(file, done) {
            try {
                writeFileSync(file, zipped.memory());
            } catch (err) {
                if (done) return done(err);
                throw err;
            }
            done?.(null);
            return zipped;
        }
    };

    callback(null, zipped);
}

module.exports = { zip };
