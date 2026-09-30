/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The updater's build provenance check, against real attestations for GitHub CLI 2.102.0
// (gh_2.102.0_linux_amd64.tar.gz): its Sigstore build provenance, and GitHub's own release attestation

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";

import { load, ROOT } from "./helpers.mjs";

const DIGEST = "bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386";
const GH_WORKFLOW = "https://github.com/cli/cli/.github/workflows/deployment.yml@refs/heads/trunk";
const fixture = name => readFileSync(join(ROOT, "test/nightcord/fixtures", name));

let snappyDecode, checkBundle, checkProvenance, provenance, release;
before(async () => {
    ({ snappyDecode, checkBundle, checkProvenance } = await load("src/main/updater/provenance.ts"));
    provenance = JSON.parse(snappyDecode(fixture("gh-cli-2.102.0-provenance.json.sn")).toString("utf8"));
    release = JSON.parse(snappyDecode(fixture("gh-cli-2.102.0-attestation.json.sn")).toString("utf8"));
});

describe("snappy", () => {
    it("decodes GitHub's bundles", () => assert.match(provenance.mediaType, /sigstore\.bundle/));
    it("rejects garbage", () => assert.throws(() => snappyDecode(Buffer.from([0x05, 0xff, 0x01]))));
});

describe("checkBundle", () => {
    it("accepts the real provenance for the real file and workflow", () => {
        assert.equal(checkBundle(provenance, DIGEST, GH_WORKFLOW), null);
    });
    it("rejects another file", () => {
        assert.equal(checkBundle(provenance, "00".repeat(32), GH_WORKFLOW), "signed for a different file");
    });
    it("rejects another workflow, such as Nightcord's", () => {
        assert.match(checkBundle(provenance, DIGEST, "https://github.com/1223321313333/Nightcord/.github/workflows/build.yml@refs/heads/main"), /^signed by /);
    });
    it("rejects a changed statement", () => {
        const tampered = structuredClone(provenance);
        const body = Buffer.from(tampered.dsseEnvelope.payload, "base64").toString("utf8").replace(DIGEST, "11".repeat(32));
        tampered.dsseEnvelope.payload = Buffer.from(body).toString("base64");
        assert.equal(checkBundle(tampered, "11".repeat(32), GH_WORKFLOW), "bad signature");
    });
    it("does not take GitHub's release attestation as build provenance", () => {
        assert.equal(checkBundle(release, DIGEST, "https://dotcom.releases.github.com"), "certificate not issued by Sigstore");
    });
});

describe("checkProvenance", () => {
    const download = async () => fixture("gh-cli-2.102.0-provenance.json.sn");

    it("refuses when GitHub has no attestation", async () => {
        const get = async () => { throw new Error("GET https://api.github.com/x: 404 Not Found"); };
        assert.equal((await checkProvenance(get, download, "1223321313333/Nightcord", DIGEST)).ok, false);
    });
    it("does not block updates when GitHub cannot be asked", async () => {
        const get = async () => { throw new Error("GET https://api.github.com/x failed: ENOTFOUND"); };
        assert.equal((await checkProvenance(get, download, "1223321313333/Nightcord", DIGEST)).ok, "unknown");
    });
    it("downloads bundles from bundle_url and checks the workflow of the given repository", async () => {
        const get = async () => ({ attestations: [{ bundle: null, bundle_url: "https://storage.example/x.json.sn" }] });
        assert.equal((await checkProvenance(get, download, "cli/cli", DIGEST)).ok, false, "gh's workflow is not build.yml on main");
        const result = await checkProvenance(get, download, "1223321313333/Nightcord", DIGEST);
        assert.equal(result.ok, false);
        assert.match(result.reason, /signed by URI:https:\/\/github\.com\/cli\/cli/);
    });
});
