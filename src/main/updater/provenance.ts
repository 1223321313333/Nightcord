/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord: before an update is installed, check GitHub's signed build provenance for it. The build workflow
// (.github/workflows/build.yml) attests every desktop.asar with Sigstore; here the attestation for the downloaded
// file's sha256 must be signed by a Fulcio certificate issued to exactly that workflow on main.
//
// Checked: the certificate chain up to the embedded Fulcio root, the certificate identity, that the certificate was
// valid when the signature was logged, the DSSE signature, and that the signed statement names this sha256.
// Not checked: the transparency log inclusion proof (it would need Rekor's key and more code). Someone would still
// need a certificate Fulcio issued to this repository's build workflow on main, which only that workflow can get.

import { verify, X509Certificate } from "crypto";

import { FULCIO_INTERMEDIATE, FULCIO_ROOT } from "./sigstoreRoots";

interface SigstoreBundle {
    verificationMaterial?: {
        certificate?: { rawBytes: string; };
        x509CertificateChain?: { certificates: { rawBytes: string; }[]; };
        tlogEntries?: { integratedTime?: string; }[];
    };
    dsseEnvelope?: {
        payload: string;
        payloadType: string;
        signatures: { sig: string; }[];
    };
}

const der = (b64: string) => new X509Certificate(Buffer.from(b64, "base64"));

/** Snappy block format decoder. GitHub serves attestation bundles (bundle_url) compressed with it */
export function snappyDecode(src: Buffer): Buffer {
    let pos = 0;
    let length = 0;
    for (let shift = 0; ; shift += 7) {
        const b = src[pos++];
        if (b === undefined || shift > 28) throw new Error("bad snappy header");
        length |= (b & 0x7f) << shift;
        if (b < 0x80) break;
    }

    const out = Buffer.alloc(length);
    let o = 0;
    while (pos < src.length) {
        const tag = src[pos++];
        if ((tag & 3) === 0) {
            let len = tag >> 2;
            if (len >= 60) {
                const bytes = len - 59;
                len = 0;
                for (let i = 0; i < bytes; i++) len |= src[pos++] << (8 * i);
            }
            len += 1;
            if (pos + len > src.length || o + len > length) throw new Error("bad snappy literal");
            src.copy(out, o, pos, pos + len);
            pos += len;
            o += len;
            continue;
        }

        let len: number, offset: number;
        if ((tag & 3) === 1) {
            len = ((tag >> 2) & 7) + 4;
            offset = ((tag >> 5) << 8) | src[pos++];
        } else if ((tag & 3) === 2) {
            len = (tag >> 2) + 1;
            offset = src.readUInt16LE(pos);
            pos += 2;
        } else {
            len = (tag >> 2) + 1;
            offset = src.readUInt32LE(pos);
            pos += 4;
        }
        if (offset === 0 || offset > o || o + len > length) throw new Error("bad snappy copy");
        // copies may overlap what they write, so byte by byte
        for (let i = 0; i < len; i++, o++) out[o] = out[o - offset];
    }
    if (o !== length) throw new Error("truncated snappy data");
    return out;
}
let chain: [X509Certificate, X509Certificate] | null = null;

/** Why the bundle does not prove that `workflow` built a file with this sha256, or null if it does */
export function checkBundle(bundle: SigstoreBundle, sha256: string, workflowIdentity: string): string | null {
    chain ??= [der(FULCIO_INTERMEDIATE), der(FULCIO_ROOT)];
    const [intermediate, root] = chain;

    const material = bundle.verificationMaterial;
    const leafB64 = material?.certificate?.rawBytes ?? material?.x509CertificateChain?.certificates?.[0]?.rawBytes;
    if (!leafB64 || !bundle.dsseEnvelope) return "no certificate or signature";

    const leaf = der(leafB64);
    if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) return "certificate not issued by Sigstore";
    if (!intermediate.checkIssued(root) || !intermediate.verify(root.publicKey)) return "broken Sigstore chain";

    if (leaf.subjectAltName !== `URI:${workflowIdentity}`) return `signed by ${leaf.subjectAltName ?? "someone else"}`;

    // Fulcio certificates live for minutes; what matters is that it was valid when the signature was logged
    const loggedAt = Number(material?.tlogEntries?.[0]?.integratedTime) * 1000;
    if (!(loggedAt >= Date.parse(leaf.validFrom) && loggedAt <= Date.parse(leaf.validTo))) return "certificate was not valid when signed";

    const { payload, payloadType, signatures } = bundle.dsseEnvelope;
    const body = Buffer.from(payload, "base64");
    const pae = Buffer.concat([Buffer.from(`DSSEv1 ${Buffer.byteLength(payloadType)} ${payloadType} ${body.length} `), body]);
    if (!signatures?.some(s => verify("sha256", pae, leaf.publicKey, Buffer.from(s.sig, "base64")))) return "bad signature";

    let statement: { subject?: { digest?: { sha256?: string; }; }[]; };
    try {
        statement = JSON.parse(body.toString("utf8"));
    } catch {
        return "unreadable statement";
    }
    if (!statement.subject?.some(s => s.digest?.sha256?.toLowerCase() === sha256.toLowerCase())) return "signed for a different file";

    return null;
}

export type ProvenanceResult =
    | { ok: true; }
    /** GitHub answered, and nothing proves the file came from the build workflow: do not install */
    | { ok: false; reason: string; }
    /** GitHub could not be asked (offline, rate limited): the sha256 check alone has to do */
    | { ok: "unknown"; reason: string; };

/**
 * `githubGet` fetches a path under https://api.github.com/repos/<repo>; `download` fetches bundle_url, where GitHub
 * keeps bundles it no longer puts in the API answer (snappy-compressed JSON on its own storage).
 */
export async function checkProvenance(
    githubGet: (endpoint: string) => Promise<any>,
    download: (url: string) => Promise<Buffer>,
    repo: string,
    sha256: string
): Promise<ProvenanceResult> {
    const identity = `https://github.com/${repo}/.github/workflows/build.yml@refs/heads/main`;

    let data: { attestations?: { bundle?: SigstoreBundle | null; bundle_url?: string; }[]; };
    try {
        data = await githubGet(`/attestations/sha256:${sha256}`);
    } catch (err: any) {
        const status = String(err?.message ?? err);
        // 404: GitHub has no attestation for this file at all
        if (/: 404\b/.test(status)) return { ok: false, reason: "no signed build provenance for this file" };
        return { ok: "unknown", reason: status };
    }

    const reasons: string[] = [];
    for (const attestation of data.attestations ?? []) {
        try {
            let { bundle } = attestation;
            if (!bundle && attestation.bundle_url?.startsWith("https://")) {
                try {
                    bundle = JSON.parse(snappyDecode(await download(attestation.bundle_url)).toString("utf8"));
                } catch (err) {
                    return { ok: "unknown", reason: `could not download the signature: ${err}` };
                }
            }
            if (!bundle) continue;
            const why = checkBundle(bundle, sha256, identity);
            if (why == null) return { ok: true };
            reasons.push(why);
        } catch (err) {
            reasons.push(String(err));
        }
    }
    return { ok: false, reason: reasons.length ? reasons.join("; ") : "no signed build provenance for this file" };
}
