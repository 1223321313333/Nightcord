/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading, Paragraph } from "@equicord/types/components";
import { Margins } from "@equicord/types/utils";
import { Select } from "@equicord/types/webpack/common";

import { SimpleErrorBoundary } from "../SimpleErrorBoundary";
import { SettingsComponent } from "./Settings";

export const DnsOverHttpsPicker: SettingsComponent = ({ settings }) => {
    return (
        <SimpleErrorBoundary>
            <div>
                <Heading tag="h5">Encrypted DNS (DNS over HTTPS)</Heading>
                <Paragraph className={Margins.bottom8}>
                    Looks up server addresses over an encrypted connection, so your network or ISP cannot see which
                    hostnames you open. They still see that you connect to Discord. Requires a full restart. If the
                    internet stops working after turning this on, your network may block the provider — set it back to
                    Off.
                </Paragraph>
                <Select
                    placeholder="Off"
                    options={[
                        { label: "Off (use the system's DNS)", value: "off", default: true },
                        { label: "Cloudflare (1.1.1.1)", value: "cloudflare" },
                        { label: "Quad9 (9.9.9.9)", value: "quad9" }
                    ]}
                    closeOnSelect={true}
                    select={v => (settings.dnsOverHttps = v)}
                    isSelected={v => v === (settings.dnsOverHttps ?? "off")}
                    serialize={s => s}
                />
            </div>
        </SimpleErrorBoundary>
    );
};
