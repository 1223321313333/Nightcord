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

let buildCsp, parsePolicy, stringifyPolicy, CspPolicies;
before(async () => ({ buildCsp, parsePolicy, stringifyPolicy, CspPolicies } = await load("src/main/csp/policy.ts")));

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
