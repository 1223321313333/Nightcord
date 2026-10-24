/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./NightcordUI.css";

import { Button } from "@components/Button";
import { copyToClipboard } from "@utils/clipboard";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { showToast } from "@webpack/common";
import qrcode from "qrcode-generator";

// Crypto tip jar. USDT is a jetton on The Open Network (TON); jettons and TON itself
// are received on the same wallet address, so one address covers it.
const CRYPTO = {
    coin: "USDT",
    network: "TON",
    address: "UQBsUwIph_dfhm_JfTcMAcYD-y4waDX6kDBNzJrCz7pS8hQQ"
} as const;

// Opens an installed TON wallet (Tonkeeper, MyTonWallet, ...) on the send screen for this address.
const WALLET_URI = `ton://transfer/${CRYPTO.address}`;

// The QR encodes the plain address, which every TON wallet can scan. Built once at module load.
const QR_SVG = (() => {
    try {
        const qr = qrcode(0, "M");
        qr.addData(CRYPTO.address);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch {
        return null;
    }
})();

export function CryptoDonate() {
    return (
        <div className={`vc-nc-card ${Margins.top16}`}>
            <div className="vc-nc-crypto-head">
                <span className="vc-nc-badge">💜</span>
                <div className="vc-nc-grow">
                    <div className="vc-nc-title">
                        {t("Support Nightcord")}
                        <span className="vc-nc-crypto-net">{CRYPTO.coin} · {CRYPTO.network}</span>
                    </div>
                    <div className="vc-nc-desc">
                        {t("Send only USDT on the TON network to this address. Sending another coin or network will lose the funds.")}
                    </div>
                </div>
            </div>

            <div className="vc-nc-crypto-body">
                {QR_SVG && (
                    <div
                        className="vc-nc-crypto-qr"
                        role="img"
                        aria-label={t("Scan to donate")}
                        dangerouslySetInnerHTML={{ __html: QR_SVG }}
                    />
                )}

                <div className="vc-nc-crypto-addrcol">
                    <code className="vc-nc-crypto-addr">{CRYPTO.address}</code>
                    <div className="vc-nc-crypto-actions">
                        <Button
                            variant="primary"
                            size="small"
                            type="button"
                            onClick={() => {
                                copyToClipboard(CRYPTO.address);
                                showToast({ text: t("Address copied") });
                            }}
                        >
                            {t("Copy address")}
                        </Button>
                        <Button
                            variant="secondary"
                            size="small"
                            type="button"
                            onClick={() => NightcordNative.native.openExternal(WALLET_URI)}
                        >
                            {t("Open in wallet")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
