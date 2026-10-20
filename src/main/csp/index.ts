/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings, RendererSettings } from "@main/settings";
import { session } from "electron";

import { PLUGIN_HOSTS } from "~nightcordPluginHosts";

import { buildCsp, findHeader, parsePolicy, PolicyMap, stringifyPolicy } from "./policy";

// Re-export the pure policy pieces so existing importers of "@main/csp" (plugin native.ts files, the CSP
// manager) keep working unchanged.
export * from "./policy";

const patchCsp = (headers: PolicyMap) => {
    const reportOnlyHeader = findHeader(headers, "content-security-policy-report-only");
    if (reportOnlyHeader)
        delete headers[reportOnlyHeader];

    const header = findHeader(headers, "content-security-policy");
    const raw = header ? headers[header]?.[0] : undefined;
    if (!header || !raw) return;

    const csp = buildCsp(parsePolicy(raw), {
        strict: RendererSettings.store.strictConnections !== false,
        customCspRules: NativeSettings.store.customCspRules,
        pluginHosts: PLUGIN_HOSTS
    });

    headers[header] = [stringifyPolicy(csp)];
};

export function initCsp() {
    session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, cb) => {
        if (responseHeaders) {
            if (resourceType === "mainFrame")
                patchCsp(responseHeaders);

            // Fix hosts that don't properly set the css content type, such as
            // raw.githubusercontent.com
            if (resourceType === "stylesheet") {
                const header = findHeader(responseHeaders, "content-type");
                if (header)
                    responseHeaders[header] = ["text/css"];
            }
        }

        cb({ cancel: false, responseHeaders });
    });

    // assign a noop to onHeadersReceived to prevent other mods from adding their own incompatible ones.
    // For instance, OpenAsar adds their own that doesn't fix content-type for stylesheets which makes it
    // impossible to load css from github raw despite our fix above
    session.defaultSession.webRequest.onHeadersReceived = () => { };
}
