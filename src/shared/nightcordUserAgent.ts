/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

export { gitHash, gitRemote };

export const gitHashShort = gitHash.slice(0, 9);
export const NIGHTCORD_USER_AGENT = `Nightcord/${gitHash}${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;
export const NIGHTCORD_USER_AGENT_HASHLESS = `Nightcord${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;
