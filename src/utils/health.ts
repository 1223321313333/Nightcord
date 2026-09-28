/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Collects things that went wrong while Nightcord loaded into Discord,
 * so the NightcordCheck plugin can show them without opening DevTools.
 */

export type HealthIssueKind = "patch-no-effect" | "patch-error" | "start-failed" | "module-not-found";

export interface HealthIssue {
    kind: HealthIssueKind;
    plugin: string | null;
    detail: string;
    time: number;
}

export const healthIssues: HealthIssue[] = [];

export function reportHealthIssue(kind: HealthIssueKind, plugin: string | null, detail: unknown) {
    const text = detail instanceof Error ? detail.message : String(detail);
    // The same patch can fail on several modules; keep one entry per problem
    if (healthIssues.some(i => i.kind === kind && i.plugin === plugin && i.detail === text)) return;
    healthIssues.push({ kind, plugin, detail: text.slice(0, 300), time: Date.now() });
}
