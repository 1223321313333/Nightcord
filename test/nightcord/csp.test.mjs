/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord's strict-connections CSP logic: the window may only reach Discord and the curated/plugin hosts,
// never "*", in strict mode — while user overrides and plugin hosts still work.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { load } from "./helpers.mjs";

let buildCsp, parsePolicy, stringifyPolicy, CspPolicies, validateCspOverride, isDomainAllowedBy;
before(async () => ({ buildCsp, parsePolicy, stringifyPolicy, CspPolicies, validateCspOverride, isDomainAllowedBy } = await load("src/main/csp/policy.ts")));

describe("CSP parse/stringify", () => {
    it("parses directives and their values", () => {
        const p = parsePolicy("default-src 'self'; connect-src 'self' https://a.com; img-src *");
        assert.deepEqual(p["default-src"], ["'self'"]);
        assert.deepEqual(p["connect-src"], ["'self'", "https://a.com"]);
        assert.deepEqual(p["img-src"], ["*"]);
    });

    it("keeps the first occurrence of a duplicated directive", () => {
        assert.deepEqual(parsePolicy("connect-src a; connect-src b")["connect-src"], ["a"]);
    });

    it("round-trips and drops empty directives", () => {
        assert.equal(stringifyPolicy({ "connect-src": ["a", "b"], "img-src": [] }), "connect-src a b");
    });

    it("parses a value-less directive as an empty list", () => {
        assert.deepEqual(parsePolicy("upgrade-insecure-requests"), { "upgrade-insecure-requests": [] });
    });

    it("tolerates stray semicolons and extra whitespace", () => {
        const p = parsePolicy("  connect-src   a   b ; ; img-src c ;");
        assert.deepEqual(p["connect-src"], ["a", "b"]);
        assert.deepEqual(p["img-src"], ["c"]);
        assert.ok(!("" in p), "empty segments must not create a blank directive");
    });

    it("parses an empty policy to an empty object, and stringifies it back to an empty string", () => {
        assert.deepEqual(parsePolicy(""), {});
        assert.equal(stringifyPolicy({}), "");
        assert.equal(stringifyPolicy({ "connect-src": [] }), "");
    });
});

describe("CSP buildCsp", () => {
    const base = () => ({ "default-src": ["'self'"] });
    const opts = (strict, extra = {}) => ({ strict, customCspRules: {}, pluginHosts: [], ...extra });

    it("adds Discord's inline/eval and the app schemes to the right directives", () => {
        const csp = buildCsp(base(), opts(true));
        assert.ok(csp["style-src"].includes("'unsafe-inline'"));
        assert.ok(csp["script-src"].includes("'unsafe-inline'"));
        assert.ok(csp["script-src"].includes("'unsafe-eval'"));
        for (const d of ["connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
            for (const scheme of ["blob:", "data:", "nightcord:"]) {
                assert.ok(csp[d].includes(scheme), `${d} should include ${scheme}`);
            }
        }
    });

    it("lets a newly added directive inherit default-src", () => {
        assert.ok(buildCsp(base(), opts(true))["connect-src"].includes("'self'"));
    });

    it("in strict mode keeps the curated allowlist and plugin hosts but never '*'", () => {
        CspPolicies["*"] = ["connect-src", "img-src"];
        try {
            const strict = buildCsp(base(), opts(true, { pluginHosts: ["plugin.example"] }));
            assert.ok(strict["connect-src"].includes("api.github.com"), "curated host kept");
            assert.ok(strict["connect-src"].includes("plugin.example"), "plugin host kept");
            assert.ok(!strict["connect-src"].includes("*"), "'*' must be excluded in strict mode");

            const loose = buildCsp(base(), opts(false, { pluginHosts: ["plugin.example"] }));
            assert.ok(loose["connect-src"].includes("*"), "'*' is kept when not strict");
            assert.ok(!loose["connect-src"].includes("plugin.example"), "plugin hosts only needed in strict mode");
        } finally {
            delete CspPolicies["*"];
        }
    });

    it("always applies user CSP overrides, strict or not", () => {
        for (const strict of [true, false]) {
            const csp = buildCsp(base(), opts(strict, { customCspRules: { "my.host": ["connect-src"] } }));
            assert.ok(csp["connect-src"].includes("my.host"), `override applied when strict=${strict}`);
        }
    });
});

describe("validateCspOverride", () => {
    it("accepts a real URL with image/css/font/connect directives", () => {
        assert.equal(validateCspOverride("https://example.com", ["connect-src"]), true);
        assert.equal(validateCspOverride("https://cdn.example.com/x", ["img-src", "style-src", "font-src"]), true);
    });

    it("rejects a host with characters that could break out of the policy string", () => {
        // these characters survive in URL.host and could inject into the policy string
        for (const url of ["https://evil.com;x", "https://e'il.com", "https://ev%22il.com"]) {
            assert.equal(validateCspOverride(url, ["connect-src"]), false, `${url} must be rejected`);
        }
    });

    it("rejects an unparseable URL and an empty directive list", () => {
        assert.equal(validateCspOverride("not a url", ["connect-src"]), false);
        assert.equal(validateCspOverride("https://example.com", []), false);
    });

    it("never allows directives outside image/css/font/connect (no script-src)", () => {
        assert.equal(validateCspOverride("https://example.com", ["script-src"]), false);
        assert.equal(validateCspOverride("https://example.com", ["connect-src", "script-src"]), false);
        assert.equal(validateCspOverride("https://example.com", ["worker-src"]), false);
    });
});

describe("isDomainAllowedBy", () => {
    const policies = { "api.example.com": ["connect-src"], "cdn.example.com": ["img-src", "style-src"] };
    const custom = { "my.host": ["connect-src", "img-src"] };

    it("allows a host listed in the curated policies for the requested directives", () => {
        assert.equal(isDomainAllowedBy("https://api.example.com/x", ["connect-src"], policies, custom), true);
        assert.equal(isDomainAllowedBy("https://cdn.example.com", ["img-src"], policies, custom), true);
    });

    it("allows a host listed only in the user's own overrides", () => {
        assert.equal(isDomainAllowedBy("https://my.host", ["connect-src"], policies, custom), true);
        assert.equal(isDomainAllowedBy("https://my.host", ["connect-src", "img-src"], policies, custom), true);
    });

    it("requires every requested directive to be covered", () => {
        assert.equal(isDomainAllowedBy("https://api.example.com", ["connect-src", "img-src"], policies, custom), false);
        assert.equal(isDomainAllowedBy("https://cdn.example.com", ["connect-src"], policies, custom), false);
    });

    it("rejects an unknown host and an unparseable URL", () => {
        assert.equal(isDomainAllowedBy("https://unknown.example", ["connect-src"], policies, custom), false);
        assert.equal(isDomainAllowedBy("not a url", ["connect-src"], policies, custom), false);
    });
});
