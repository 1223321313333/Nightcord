/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

export const enum IpcEvents {
    INIT_FILE_WATCHERS = "NightcordInitFileWatchers",
    QUICK_CSS_UPDATE = "NightcordQuickCssUpdate",
    OPEN_QUICKCSS = "NightcordOpenQuickCss",
    GET_QUICK_CSS = "NightcordGetQuickCss",
    SET_QUICK_CSS = "NightcordSetQuickCss",
    UPLOAD_THEME = "NightcordUploadTheme",
    DELETE_THEME = "NightcordDeleteTheme",
    GET_THEMES_LIST = "NightcordGetThemesList",
    GET_THEME_DATA = "NightcordGetThemeData",
    GET_THEME_SYSTEM_VALUES = "NightcordGetThemeSystemValues",
    GET_SETTINGS_DIR = "NightcordGetSettingsDir",
    GET_SETTINGS = "NightcordGetSettings",
    SET_SETTINGS = "NightcordSetSettings",
    THEME_UPDATE = "NightcordThemeUpdate",
    OPEN_EXTERNAL = "NightcordOpenExternal",
    GET_UPDATES = "NightcordGetUpdates",
    GET_REPO = "NightcordGetRepo",
    UPDATE = "NightcordUpdate",
    BUILD = "NightcordBuild",
    OPEN_MONACO_EDITOR = "NightcordOpenMonacoEditor",
    GET_MONACO_THEME = "NightcordGetMonacoTheme",

    GET_PLUGIN_IPC_METHOD_MAP = "NightcordGetPluginIpcMethodMap",

    CSP_IS_DOMAIN_ALLOWED = "NightcordCspIsDomainAllowed",
    CSP_REMOVE_OVERRIDE = "NightcordCspRemoveOverride",
    CSP_REQUEST_ADD_OVERRIDE = "NightcordCspRequestAddOverride",

    OPEN_THEMES_FOLDER = "NightcordOpenThemesFolder",
    OPEN_SETTINGS_FOLDER = "NightcordOpenSettingsFolder",
    GET_RENDERER_CSS = "NightcordGetRendererCss",
    RENDERER_CSS_UPDATE = "NightcordRendererCssUpdate",
    PRELOAD_GET_RENDERER_JS = "NightcordPreloadGetRendererJs",

    SET_TRAY_UPDATE_STATE = "NightcordSetTrayUpdateState",
    TRAY_REPAIR = "NightcordTrayRepair",
    TRAY_CHECK_UPDATES = "NightcordTrayCheckUpdates",
    TRAY_ABOUT = "NightcordTrayAbout",
    SUPPORTS_WINDOWS_MATERIAL = "NightcordSupportsWindowsMaterial",

    // Nightcord safe mode (src/main/safeMode.ts)
    GET_STARTUP_STATE = "NightcordGetStartupState",
    STARTUP_OK = "NightcordStartupOk",
    RESET_STARTUP = "NightcordResetStartup",
}
