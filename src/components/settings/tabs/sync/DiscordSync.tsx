/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord: settings sync through the user's own Discord server instead of a third-party cloud. The backup is a
// password-encrypted file (src/utils/syncCrypto.ts) posted in a channel the user owns; loading takes the newest one.

import * as DataStore from "@api/DataStore";
import { importSettings } from "@api/SettingsSync/offline";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { t } from "@utils/i18n";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { decryptBackup, WrongPasswordError } from "@utils/syncCrypto";
import { Alerts, Checkbox, Constants, GuildChannelStore, GuildStore, Modal, openModal, React, RestAPI, Select, showToast, TextInput, Toasts, useEffect, UserStore, useState } from "@webpack/common";

import { AUTO_AT_KEY, AUTO_KEY, AUTO_PW_KEY, backupNow, CHANNEL_KEY, FILE_NAME } from "./backup";

const logger = new Logger("DiscordSync");

function ownTextChannels() {
    const me = UserStore.getCurrentUser()?.id;
    return Object.values(GuildStore.getGuilds())
        .filter(g => g.ownerId === me)
        .flatMap(g => (GuildChannelStore.getChannels(g.id)?.SELECTABLE ?? [])
            .map(({ channel }) => channel)
            .filter(c => c.type === 0)
            .map(c => ({ value: c.id, label: `${g.name} → #${c.name}` })));
}

function askPassword(title: string, confirmText: string, twice: boolean): Promise<string | null> {
    return new Promise(resolve => {
        let done = false;
        const finish = (value: string | null) => {
            if (!done) resolve(value);
            done = true;
        };
        openModal(props => {
            const [a, setA] = useState("");
            const [b, setB] = useState("");
            const mismatch = twice && b.length > 0 && a !== b;
            return (
                <Modal
                    {...props}
                    size="sm"
                    title={title}
                    onClose={() => { finish(null); props.onClose(); }}
                    actions={[{
                        text: confirmText,
                        variant: "primary",
                        disabled: a.length < 8 || (twice && a !== b),
                        onClick: () => { finish(a); props.onClose(); }
                    }]}
                >
                    <Paragraph size="sm" className={Margins.bottom8}>
                        {twice
                            ? t("At least 8 characters. Nightcord cannot recover it: without the password the backup cannot be opened.")
                            : t("The password you chose when saving.")}
                    </Paragraph>
                    <TextInput type="password" value={a} onChange={setA} placeholder={t("Password")} autoFocus />
                    {twice && (
                        <div className={Margins.top8}>
                            <TextInput type="password" value={b} onChange={setB} placeholder={t("Password again")} />
                            {mismatch && <Paragraph size="sm" style={{ color: "var(--text-danger)" }}>{t("The passwords do not match")}</Paragraph>}
                        </div>
                    )}
                </Modal>
            );
        });
    });
}

async function saveToDiscord(channelId: string) {
    const password = await askPassword(t("Password for the backup"), t("Save"), true);
    if (!password) return;
    await backupNow(channelId, password);
    showToast(t("Settings saved to your Discord server"), Toasts.Type.SUCCESS);
}

async function loadFromDiscord(channelId: string) {
    const me = UserStore.getCurrentUser()?.id;
    const { body } = await RestAPI.get({ url: Constants.Endpoints.MESSAGES(channelId), query: { limit: 50 } });
    const message = (body as any[]).find(m => m.author?.id === me && m.attachments?.some((a: any) => a.filename === FILE_NAME));
    const attachment = message?.attachments.find((a: any) => a.filename === FILE_NAME);
    if (!attachment) {
        showToast(t("No Nightcord backup in this channel yet"), Toasts.Type.FAILURE);
        return;
    }

    const password = await askPassword(t("Password of the backup"), t("Load backup"), false);
    if (!password) return;

    const bytes = new Uint8Array(await (await fetch(attachment.url)).arrayBuffer());
    let json: string;
    try {
        json = await decryptBackup(bytes, password);
    } catch (err) {
        showToast(err instanceof WrongPasswordError ? t("Wrong password") : t("This file is not a Nightcord backup"), Toasts.Type.FAILURE);
        return;
    }

    await importSettings(json, "all");
    Alerts.show({
        title: t("Settings loaded"),
        body: t("Restart Discord to apply them."),
        confirmText: t("Restart now"),
        cancelText: t("Later!"),
        onConfirm: relaunch
    });
}

async function createServer(): Promise<string | null> {
    try {
        const { body } = await RestAPI.post({ url: "/guilds", body: { name: "Nightcord" } });
        const { body: channels } = await RestAPI.get({ url: `/guilds/${body.id}/channels` });
        return (channels as any[]).find(c => c.type === 0)?.id ?? null;
    } catch (err) {
        logger.error("Could not create the server", err);
        showToast(t("Discord did not create the server. Create one yourself with + in the server list, then pick its channel here."), Toasts.Type.FAILURE);
        return null;
    }
}

async function enableAutoBackup(channelId: string): Promise<boolean> {
    let password = await DataStore.get<string>(AUTO_PW_KEY);
    if (!password) {
        password = await askPassword(t("Password for automatic backups"), t("Save"), true) ?? undefined;
        if (!password) return false;
        await DataStore.set(AUTO_PW_KEY, password);
    }
    await DataStore.set(AUTO_KEY, true);
    await backupNow(channelId, password);
    await DataStore.set(AUTO_AT_KEY, Date.now());
    showToast(t("Settings saved to your Discord server"), Toasts.Type.SUCCESS);
    return true;
}

export function DiscordSync() {
    const [channelId, setChannelId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [options, setOptions] = useState(ownTextChannels);
    const [auto, setAuto] = useState(false);
    const [lastAt, setLastAt] = useState<number | null>(null);

    useEffect(() => {
        DataStore.get<string>(CHANNEL_KEY).then(id => id && setChannelId(id));
        DataStore.get<boolean>(AUTO_KEY).then(v => setAuto(!!v));
        DataStore.get<number>(AUTO_AT_KEY).then(v => v && setLastAt(v));
    }, []);

    const choose = (id: string) => {
        setChannelId(id);
        void DataStore.set(CHANNEL_KEY, id);
    };

    const run = (fn: () => Promise<void>) => async () => {
        setBusy(true);
        try {
            await fn();
        } catch (err) {
            logger.error(err);
            showToast(t("Something went wrong, see the console"), Toasts.Type.FAILURE);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className={Margins.top20}>
            <Heading>{t("Sync through your Discord")}</Heading>
            <Paragraph className={Margins.bottom16}>
                {t("Keep an encrypted copy of your Nightcord settings, QuickCSS, bookmarks and notes in a channel of your own Discord server, and load it on another computer. No other service is involved; without your password nobody, Discord included, can read it.")}
            </Paragraph>

            {options.length ? (
                <Select
                    options={options}
                    isSelected={(v: string) => v === channelId}
                    select={choose}
                    serialize={(v: string) => v}
                    placeholder={t("Channel on a server you own")}
                />
            ) : (
                <Paragraph size="sm" className={Margins.bottom8}>{t("You do not own a server yet. Nightcord can create a private one just for this.")}</Paragraph>
            )}

            <Flex gap="8px" className={Margins.top8} style={{ flexWrap: "wrap" }}>
                <Button size="small" disabled={busy || !channelId} onClick={run(() => saveToDiscord(channelId!))}>{t("Save to Discord")}</Button>
                <Button size="small" variant="secondary" disabled={busy || !channelId} onClick={run(() => loadFromDiscord(channelId!))}>{t("Load from Discord")}</Button>
                {!options.length && (
                    <Button size="small" variant="secondary" disabled={busy} onClick={run(async () => {
                        const id = await createServer();
                        if (!id) return;
                        setOptions(ownTextChannels());
                        choose(id);
                    })}>
                        {t("Create a private server")}
                    </Button>
                )}
            </Flex>
            <Paragraph size="sm" className={Margins.top8}>
                {t("Use a server only you are in: members could download the file, though without the password it is useless.")}
            </Paragraph>

            <div className={Margins.top16}>
                <Checkbox
                    value={auto}
                    disabled={busy || !channelId}
                    onChange={(_: unknown, v: boolean) => {
                        if (v) {
                            run(async () => {
                                if (!await enableAutoBackup(channelId!)) return;
                                setAuto(true);
                                setLastAt(Date.now());
                            })();
                        } else {
                            setAuto(false);
                            void DataStore.set(AUTO_KEY, false);
                            void DataStore.del(AUTO_PW_KEY);
                        }
                    }}
                >
                    <Paragraph size="sm">{t("Save a copy automatically once a week")}</Paragraph>
                </Checkbox>
                <Paragraph size="sm" className={Margins.top8} style={{ opacity: 0.7 }}>
                    {t("The password is kept on this computer so the copy can be made on its own. Anyone with access to this computer could read it, but it is only ever used to protect the copy in Discord.")}
                    {auto && lastAt ? " " + t("Last copy:") + " " + new Date(lastAt).toLocaleString() : ""}
                </Paragraph>
            </div>
        </section>
    );
}
