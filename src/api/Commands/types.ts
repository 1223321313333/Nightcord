/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Command } from "@nightcord/discord-types";
export { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType } from "@nightcord/discord-types/enums";

export interface NightcordCommand extends Command {
    isNightcordCommand?: boolean;
    rootCommand?: NightcordCommand;
}
