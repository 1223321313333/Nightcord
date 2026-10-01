/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { globalExternalsWithRegExp } from "@fal-works/esbuild-plugin-global-externals";

const names: Record<string, string> = {
    webpack: "Nightcord.Webpack",
    "webpack/common": "Nightcord.Webpack.Common",
    utils: "Nightcord.Util",
    api: "Nightcord.Api",
    "api/settings": "Nightcord",
    components: "Nightcord.Components"
};

export default globalExternalsWithRegExp({
    getModuleInfo(modulePath) {
        const path = modulePath.replace("@equicord/types/", "");
        let varName = names[path] as string | undefined;
        if (!varName) {
            const altMapping = names[path.split("/")[0]] as string | undefined;
            if (!altMapping) throw new Error("Unknown module path: " + modulePath);

            varName =
                altMapping +
                "." +
                // @ts-ignore
                path.split("/")[1].replaceAll("/", ".");
        }
        return {
            varName,
            type: "cjs"
        };
    },
    modulePathFilter: /^@equicord\/types.+$/
});
