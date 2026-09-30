/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import * as DataStore from "@api/DataStore";
import { Channel, Message } from "@nightcord/discord-types";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { IconComponent } from "@utils/types";
import { Alerts, ChannelStore, ContextMenuApi, Menu, Parser, React, Toasts, UserStore } from "@webpack/common";

import {
    decryptMessage, deriveChatKey, encryptMessage, exportPublicKey, findEncrypted, findPublicKey,
    fitsInOneMessage, generateKeyPair, KEY_TAG, MESSAGE_TAG, safetyCode
} from "./crypto";

const logger = new Logger("SecretChat");
const STORE_KEY = "Nightcord_SecretChat";
const SITE = "https://1223321313333.github.io/Nightcord/";

interface Peer {
    /** their public key, base64 */
    key: string;
    /** a different key they sent later, waiting for the user to accept it */
    changedTo?: string;
}

interface State {
    keyPair?: CryptoKeyPair;
    publicKey?: string;
    /** by user id */
    peers: Record<string, Peer>;
    /** DM channels where outgoing messages are encrypted */
    enabled: Record<string, true>;
}

let state: State = { peers: {}, enabled: {} };
let ready: Promise<void> = Promise.resolve();
const chatKeys = new Map<string, Promise<CryptoKey>>();
const decrypted = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

const toast = (message: string, type = Toasts.Type.MESSAGE) => Toasts.show({ message, type, id: Toasts.genId() });
const me = () => UserStore.getCurrentUser()?.id;

async function save() {
    await DataStore.set(STORE_KEY, state);
    listeners.forEach(l => l());
}

function useSecretState() {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => {
        listeners.add(force);
        return () => void listeners.delete(force);
    }, []);
    return state;
}

/** The other person in a DM, or null for anything that is not a one-to-one DM */
function peerOf(channel: Channel | undefined) {
    return channel?.isDM?.() ? channel.getRecipientId() ?? null : null;
}

function chatKey(channelId: string, peerId: string, peerKey: string) {
    const id = `${channelId}:${peerKey}`;
    let key = chatKeys.get(id);
    if (!key) {
        key = deriveChatKey(state.keyPair!.privateKey, peerKey, channelId, [me()!, peerId]);
        chatKeys.set(id, key);
    }
    return key;
}

/** Remember a key the other person sent. The first one is trusted; a different one later needs the user's OK */
export async function learnKey(message: Message, channel: Channel) {
    const peerId = peerOf(channel);
    const key = findPublicKey(message.content);
    if (!peerId || !key || message.author?.id !== peerId) return;
    await ready;

    const peer = state.peers[peerId];
    if (!peer) state.peers[peerId] = { key };
    else if (peer.key !== key && peer.changedTo !== key) peer.changedTo = key;
    else return;
    await save();
}

async function sendOwnKey(channelId: string) {
    await ready;
    await sendMessage(channelId, {
        content: `🔐 Предлагаю переписку с шифрованием: такие сообщения сможем прочитать только мы двое. Нужен Nightcord — ${SITE} ||${KEY_TAG}${state.publicKey}||`
    });
}

function enable(channel: Channel) {
    const peerId = peerOf(channel)!;
    const hasTheirKey = !!state.peers[peerId];
    Alerts.show({
        title: "Включить шифрование в этом чате?",
        body: hasTheirKey
            ? "Ваши сообщения здесь будут видны только вам двоим: Discord увидит вместо текста «🔒 [спойлер]». Файлы, картинки и реакции не шифруются. Собеседник отправит вам свой ключ или уже отправил — всё готово."
            : "Nightcord отправит собеседнику сообщение с вашим открытым ключом. Когда он включит шифрование у себя (для этого нужен Nightcord), ваши сообщения будут видны только вам двоим. Пока его ключа нет, отправка зашифрованных сообщений будет ждать. Файлы, картинки и реакции не шифруются.",
        confirmText: hasTheirKey ? "Включить и отправить свой ключ" : "Отправить ключ и включить",
        cancelText: "Отмена",
        async onConfirm() {
            await setEnabled(channel.id, true);
            await sendOwnKey(channel.id);
        }
    });
}

export async function setEnabled(channelId: string, on: boolean) {
    await ready;
    if (on) state.enabled[channelId] = true;
    else delete state.enabled[channelId];
    await save();
}

async function disable(channelId: string) {
    await setEnabled(channelId, false);
    toast("Шифрование в этом чате выключено: следующие сообщения уйдут обычным текстом");
}

async function showSafetyCode(channel: Channel) {
    const peer = state.peers[peerOf(channel)!];
    if (!peer || !state.publicKey) return toast("Собеседник ещё не прислал свой ключ");
    const code = await safetyCode(state.publicKey, peer.key);
    Alerts.show({
        title: "Код безопасности",
        body: (
            <>
                <div style={{ fontFamily: "var(--font-code)", fontSize: 20, margin: "8px 0 12px", color: "var(--text-strong, var(--header-primary))" }}>{code}</div>
                <div>Сверьте этот код с собеседником голосом или при встрече. Если коды совпадают, вашу переписку никто не подменяет. Код меняется, только если кто-то из вас переустановил Nightcord.</div>
            </>
        ),
        confirmText: "Понятно"
    });
}

export async function acceptChangedKey(peerId: string) {
    const peer = state.peers[peerId];
    if (!peer?.changedTo) return;
    peer.key = peer.changedTo;
    delete peer.changedTo;
    await save();
    toast("Новый ключ собеседника принят. Сверьте код безопасности", Toasts.Type.SUCCESS);
}

const LockIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <path fill="currentColor" d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V7a3 3 0 0 0-6 0v3Zm3 4a1.5 1.5 0 0 0-1 2.6V18h2v-1.4a1.5 1.5 0 0 0-1-2.6Z" />
    </svg>
);

function SecretMenu({ channel }: { channel: Channel; }) {
    const s = useSecretState();
    const on = !!s.enabled[channel.id];
    return (
        <Menu.Menu navId="nc-secret-chat" onClose={ContextMenuApi.closeContextMenu}>
            {on
                ? <Menu.MenuItem id="nc-secret-off" label="Выключить шифрование" action={() => disable(channel.id)} />
                : <Menu.MenuItem id="nc-secret-on" label="Включить шифрование" action={() => enable(channel)} />}
            <Menu.MenuItem id="nc-secret-code" label="Код безопасности" action={() => showSafetyCode(channel)} />
            <Menu.MenuItem id="nc-secret-resend" label="Отправить свой ключ ещё раз" action={() => sendOwnKey(channel.id)} />
        </Menu.Menu>
    );
}

const SecretButton: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    const s = useSecretState();
    if (!isMainChat || !peerOf(channel)) return null;
    const on = !!s.enabled[channel.id];
    const waiting = on && !s.peers[peerOf(channel)!];
    return (
        <ChatBarButton
            tooltip={on ? (waiting ? "Шифрование: ждём ключ собеседника" : "Шифрование включено") : "Шифрование выключено"}
            onClick={e => ContextMenuApi.openContextMenu(e, () => <SecretMenu channel={channel} />)}
        >
            <LockIcon style={{ color: on ? "var(--status-positive, #23a55a)" : undefined }} />
        </ChatBarButton>
    );
};

const boxStyle: React.CSSProperties = {
    marginTop: 4, padding: "6px 10px", borderRadius: 8, maxWidth: "fit-content",
    background: "var(--background-surface-high, var(--background-secondary))",
    borderLeft: "3px solid var(--status-positive, #23a55a)"
};

function Decrypted({ message, channel, payload }: { message: Message; channel: Channel; payload: string; }) {
    const s = useSecretState();
    const [text, setText] = React.useState<string | null>(null);
    const [failed, setFailed] = React.useState(false);
    const peerId = peerOf(channel)!;
    const peerKey = s.peers[peerId]?.key;

    React.useEffect(() => {
        if (!peerKey || !s.keyPair) return;
        const id = `${message.id}:${peerKey}`;
        let p = decrypted.get(id);
        if (!p) {
            p = chatKey(channel.id, peerId, peerKey).then(key => decryptMessage(key, payload, channel.id, message.author.id));
            decrypted.set(id, p);
        }
        p.then(setText, () => setFailed(true));
    }, [message.id, peerKey, s.keyPair]);

    if (!peerKey) return <div style={boxStyle}>🔒 Зашифровано. Чтобы прочитать, нужен ключ собеседника: попросите его отправить ключ.</div>;
    if (failed) return <div style={{ ...boxStyle, borderLeftColor: "var(--status-danger, #f23f43)" }}>🔒 Не получилось расшифровать: сообщение изменено или отправлено с другим ключом.</div>;
    if (text == null) return null;
    return <div style={boxStyle}>{Parser.parse(text)}</div>;
}

function KeyOffer({ message, channel }: { message: Message; channel: Channel; }) {
    const s = useSecretState();
    const peerId = peerOf(channel)!;
    React.useEffect(() => { void learnKey(message, channel); }, [message.id]);

    if (message.author?.id !== peerId) return null;
    const peer = s.peers[peerId];
    const key = findPublicKey(message.content);

    if (peer?.changedTo === key) {
        return (
            <div style={{ ...boxStyle, borderLeftColor: "var(--status-warning, #f0b232)" }}>
                ⚠️ Собеседник прислал другой ключ. Так бывает после переустановки Nightcord, но так же выглядит и подмена.
                Сверьте код безопасности голосом, прежде чем принять.{" "}
                <a role="button" onClick={() => acceptChangedKey(peerId)}>Принять новый ключ</a>
            </div>
        );
    }
    if (s.enabled[channel.id]) return <div style={boxStyle}>🔐 Шифрование включено у вас обоих.</div>;
    return (
        <div style={boxStyle}>
            🔐 Собеседник предлагает шифрование.{" "}
            <a role="button" onClick={() => enable(channel)}>Включить</a>
        </div>
    );
}

export default definePlugin({
    name: "SecretChat",
    description: "End-to-end encryption in DMs with other Nightcord users: Discord only sees a spoiler with ciphertext. Turn it on with the lock button in a DM",
    tags: ["Privacy", "Chat"],
    authors: [Devs.Nightcord],
    // does nothing until encryption is turned on in a DM; the lock button makes it easy to find
    enabledByDefault: true,

    chatBarButton: {
        icon: LockIcon,
        render: SecretButton
    },

    renderMessageAccessory(props) {
        const { message, channel } = props as { message: Message; channel: Channel; };
        if (!peerOf(channel) || !message?.content) return null;
        const payload = findEncrypted(message.content);
        if (payload) return <Decrypted message={message} channel={channel} payload={payload} />;
        if (findPublicKey(message.content)) return <KeyOffer message={message} channel={channel} />;
        return null;
    },

    async onBeforeMessageSend(channelId, msg) {
        return encryptOutgoing(channelId, msg);
    },

    async onBeforeMessageEdit(channelId, _messageId, msg) {
        return encryptOutgoing(channelId, msg);
    },

    start() {
        ready = (async () => {
            state = { peers: {}, enabled: {}, ...(await DataStore.get<State>(STORE_KEY)) };
            if (!state.keyPair || !state.publicKey) {
                state.keyPair = await generateKeyPair();
                state.publicKey = await exportPublicKey(state.keyPair.publicKey);
                await save();
            }
            listeners.forEach(l => l());
        })().catch(err => logger.error("Could not load the keys", err));
    },

    stop() {
        chatKeys.clear();
        decrypted.clear();
    }
});

/**
 * Replaces the text with its encrypted form in chats with encryption on. Never lets plain text through there:
 * any problem cancels the send (a thrown error would make Discord send the original text).
 */
export async function encryptOutgoing(channelId: string, msg: { content: string; }): Promise<void | { cancel: boolean; }> {
    try {
        await ready;
        if (!state.enabled[channelId] || !msg.content) return;
        // our own key offers and already encrypted texts go as they are
        if (msg.content.includes(`||${KEY_TAG}`) || msg.content.includes(`||${MESSAGE_TAG}`)) return;

        const channel = ChannelStore.getChannel(channelId);
        const peerId = peerOf(channel);
        const peer = peerId ? state.peers[peerId] : undefined;
        if (!peerId || !peer) {
            toast("Собеседник ещё не прислал ключ, сообщение не отправлено. Выключите шифрование, чтобы писать обычным текстом", Toasts.Type.FAILURE);
            return { cancel: true };
        }
        if (peer.changedTo) {
            toast("Ключ собеседника изменился: сверьте код безопасности и примите новый ключ под его сообщением", Toasts.Type.FAILURE);
            return { cancel: true };
        }
        if (!fitsInOneMessage(msg.content)) {
            toast("Слишком длинно для одного зашифрованного сообщения, разбейте на части", Toasts.Type.FAILURE);
            return { cancel: true };
        }

        const key = await chatKey(channelId, peerId, peer.key);
        msg.content = await encryptMessage(key, msg.content, channelId, me()!);
    } catch (err) {
        logger.error("Could not encrypt, message not sent", err);
        toast("Не получилось зашифровать, сообщение не отправлено", Toasts.Type.FAILURE);
        return { cancel: true };
    }
}
