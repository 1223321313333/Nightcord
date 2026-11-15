/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Nightcord: the two headings this app took from the client (Heading and HeadingTertiary of
// @equicord/types/components). The client is dropping them under these names, and a client without them would
// leave the screen share picker and the settings pages unable to render. Built here from the client's Text
// component instead, with the size, weight, colour and margins the old ones had.

import { Margins, Text } from "@equicord/types/components";
import type { ComponentPropsWithoutRef } from "react";

// color is Text's own prop, not the HTML attribute
type Props<Tag extends "h4" | "h5"> = Omit<ComponentPropsWithoutRef<Tag>, "color">;

export function Heading({ tag = "h5", className, ...props }: Props<"h5"> & { tag?: "h5" }) {
    // the old h5 had 8px below it, unless it was given a class of its own
    return (
        <Text
            tag={tag}
            size="md"
            weight="medium"
            color="text-strong"
            className={className ?? Margins.bottom8}
            {...props}
        />
    );
}

export function HeadingTertiary(props: Props<"h4">) {
    return <Text tag="h4" size="md" weight="semibold" color="text-strong" {...props} />;
}
