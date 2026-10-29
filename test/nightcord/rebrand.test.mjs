/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// rebrand.cjs turns Equicord into "Equicord with the Nightcord name" before every sync. Text about the Vencord and
// Equicord projects themselves must keep their names, or Nightcord has to undo the rename in Equicord's files, and
// each such undo is a line that can conflict in the next sync. Text about the client itself must become Nightcord.
// The script runs here on a small repository holding one line of each kind.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { ROOT } from "./helpers.mjs";

const KEPT = [
    "Please consider supporting the development of Vencord by becoming a donor. It would mean a lot!!",
    "Please consider supporting the development of Equicord by becoming a donor. It would mean a lot! :3",
    "- Suncord was a newer fork of Vencord which eventually merged into Equicord and brought many new users!",
    "You are using an externally updated Equicord version, which we do not provide support for!",
    "Please either switch to an officially supported version of Equicord, or contact your package maintainer.",
    " * A Vencord plugin that is modified for extra features in Equicord",
    "    vencord: \"Vencord\",",
    "    equicord: \"Equicord\"",
    "Equicord Donor",
    "fetch(\"https://equicord.org/badges.json\");"
];

const RENAMED = [
    ["            label: \"Equicord\",", "            label: \"Nightcord\","],
    ["    description=\"Please consider supporting the development of Equicord by donating!\"", "    description=\"Please consider supporting the development of Nightcord by donating!\""],
    ["Open Equicord settings", "Open Nightcord settings"],
    ["You are using an Equicord update", "You are using a Nightcord update"]
];

// a select option naming another client, spread over two lines as in PlatformIndicators
const OPTION = "            {\n                label: \"Vencord\",\n                value: \"vencord\",\n            },";

let dir, out;
before(() => {
    dir = mkdtempSync(join(tmpdir(), "nightcord-rebrand-"));
    const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    git("init", "-q");
    for (const [key, value] of [["user.name", "test"], ["user.email", "test@example.invalid"], ["core.autocrlf", "false"]]) git("config", key, value);
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "sample.ts"), [...KEPT, ...RENAMED.map(([from]) => from), OPTION].join("\n") + "\n");
    git("add", "-A");
    git("commit", "-q", "-m", "sample");
    execFileSync(process.execPath, [join(ROOT, "scripts/nightcord/rebrand.cjs"), dir], { stdio: "pipe" });
    out = readFileSync(join(dir, "src", "sample.ts"), "utf8");
});
after(() => rmSync(dir, { recursive: true, force: true }));

describe("rebrand.cjs", () => {
    it("keeps the names where the text is about Vencord or Equicord themselves", () => {
        for (const line of KEPT) assert.ok(out.includes(line + "\n"), `renamed: ${line}`);
        assert.ok(out.includes(OPTION), "a client option lost its name");
    });

    it("renames the client itself", () => {
        for (const [from, to] of RENAMED) assert.ok(out.includes(to + "\n"), `${from}\n  should be\n${to}`);
    });
});
