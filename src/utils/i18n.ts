/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

/** Russian strings for Nightcord's own UI, keyed by the English original. */
const RU: Record<string, string> = {
    // Settings sidebar
    "Nightcord Settings": "Настройки Nightcord",
    "Plugins": "Плагины",
    "Themes": "Темы",
    "Updater": "Обновления",
    "Nightcord Updater": "Обновления Nightcord",
    "Cloud": "Облако",
    "Nightcord Cloud": "Облако Nightcord",
    "Backup & Restore": "Резервная копия",
    "Patch Helper": "Помощник патчей",

    // Main tab
    "Your own Discord client mod": "Ваш собственный мод для Discord",
    "Nightcord is based on Vencord by Vendicated and contributors (GPL-3.0). Updates come from your GitHub repository.":
        "Nightcord основан на Vencord от Vendicated и участников (GPL-3.0). Обновления приходят из вашего репозитория на GitHub.",
    "Open repository on GitHub": "Открыть репозиторий на GitHub",
    "Quick Actions": "Быстрые действия",
    "Notification Log": "Журнал уведомлений",
    "Edit QuickCSS": "Редактировать QuickCSS",
    "Relaunch Discord": "Перезапустить Discord",
    "Open Settings Folder": "Открыть папку настроек",
    "View Source Code": "Исходный код",
    "Settings": "Настройки",
    "settings of the Settings plugin": "настройках плагина Settings",
    "Enable Custom CSS": "Включить свой CSS",
    "Apply your configured QuickCSS": "Применять ваш QuickCSS",
    "Disable the window frame": "Убрать рамку окна",
    "Use Windows' native title bar instead of Discord's custom one": "Использовать системный заголовок окна Windows вместо заголовка Discord",
    "Enable window transparency": "Включить прозрачность окна",
    "A theme that supports transparency is required or this will do nothing. Stops the window from being resizable as a side effect":
        "Нужна тема с поддержкой прозрачности, иначе ничего не изменится. Побочный эффект: окно нельзя будет растягивать",
    "Disable minimum window size": "Убрать минимальный размер окна",
    "Allows you to resize the window to any size, even smaller than Discord's minimum size": "Окно можно сделать любого размера, даже меньше минимального в Discord",
    "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)": "Закрывать Discord по Ctrl+Q (вместо Alt+F4)",
    "Enable React Developer Tools": "Включить React Developer Tools",
    "Mainly useful for plugin developers. Ignore this if you don't know what it is": "Нужно в основном разработчикам плагинов. Если не знаете, что это, — не трогайте",
    "Restart Required": "Нужен перезапуск",
    "A restart is required to apply this change": "Чтобы применить изменение, нужно перезапустить Discord",
    "Restart now": "Перезапустить",
    "Later!": "Позже",

    // Equicord-based settings
    "Nightcord is based on Equicord and Vencord (GPL-3.0). Updates come from your GitHub repository.":
        "Nightcord основан на Equicord и Vencord (GPL-3.0). Обновления приходят из вашего репозитория на GitHub.",
    "Common actions you might want to perform. These shortcuts give you quick access to frequently used features without navigating through menus.":
        "Частые действия в один клик, без поиска по меню.",
    "Client Settings":
        "Настройки клиента",
    "Configure how Nightcord behaves and integrates with Discord. These settings affect the Discord client's appearance and behavior.":
        "Как Nightcord работает внутри Discord: внешний вид и поведение клиента.",
    "You can customize where this settings section appears in Discord's settings menu by configuring the":
        "Где этот раздел показывается в настройках Discord, можно изменить в",
    "Settings Plugin":
        "плагине Settings",
    "Show Nightcord":
        "Плагины Nightcord",
    "Show Equicord":
        "Плагины Equicord",
    "Show Vencord":
        "Плагины Vencord",

    // Notifications
    "Notifications": "Уведомления",
    "Settings for Notifications sent by Nightcord.": "Настройки уведомлений от Nightcord.",
    "Notification Settings": "Настройки уведомлений",
    "View Notification Log": "Журнал уведомлений",
    "Notification Style": "Стиль уведомлений",
    "Desktop Notification Permission denied": "Нет разрешения на системные уведомления",
    "You have denied Notification Permissions. Thus, Desktop notifications will not work!": "Вы запретили уведомления, поэтому системные уведомления работать не будут!",
    "Only use Desktop notifications when Discord is not focused": "Системные уведомления, только когда Discord не в фокусе",
    "Always use Desktop notifications": "Всегда системные уведомления",
    "Always use Nightcord notifications": "Всегда уведомления Nightcord",
    "Notification Position": "Положение уведомлений",
    "Bottom Right": "Справа внизу",
    "Top Right": "Справа вверху",
    "Notification Timeout": "Время показа уведомления",
    "Set to 0s to never automatically time out": "0 с — не скрывать автоматически",
    "Notification Log Limit": "Размер журнала уведомлений",
    "Background Material": "Фон окна",
    "None": "Нет",

    // Plugins tab
    "Restart required!": "Нужен перезапуск!",
    "Restart now to apply new plugins and their settings": "Перезапустите, чтобы применить новые плагины и их настройки",
    "Restart": "Перезапустить",
    "Plugin Management": "Управление плагинами",
    "Press the cog wheel or info icon to get more info on a plugin": "Нажмите на шестерёнку или значок «i», чтобы узнать о плагине подробнее",
    "Plugins with a cog wheel have settings you can modify!": "У плагинов с шестерёнкой есть настройки!",
    "Are you looking for:": "Возможно, вы ищете:",
    "Restart required": "Нужен перезапуск",
    "The following plugins require a restart:": "Эти плагины требуют перезапуска:",
    "Filters": "Фильтры",
    "Search for a plugin...": "Поиск плагина...",
    "Show All": "Все",
    "Show Favorites": "Избранные",
    "Show Enabled": "Включённые",
    "Show Disabled": "Выключенные",
    "Show New": "Новые",
    "Show UserPlugins": "Пользовательские",
    "Show API Plugins": "API-плагины",
    "Filter by Type": "Фильтр по типу",
    "Filter by Tags": "Фильтр по тегам",
    "No plugins meet the search criteria.": "Под условия поиска не подходит ни один плагин.",
    "Required Plugins": "Обязательные плагины",
    "This plugin is required by:": "Этот плагин нужен для:",
    "Manage plugin UI elements": "Кнопки плагинов в интерфейсе",
    "Allows you to hide buttons you don't like": "Можно скрыть ненужные кнопки",
    "Buttons of enabled plugins will appear here.": "Здесь появятся кнопки включённых плагинов.",
    "Chatbar Buttons": "Кнопки в поле ввода",
    "These are the buttons on the right side of the chat input bar": "Кнопки справа в поле ввода сообщения",
    "Message Popover Buttons": "Кнопки у сообщений",
    "These are the floating buttons on the right when you hover over a message": "Кнопки, которые появляются справа при наведении на сообщение",
    "There are no settings for this plugin.": "У этого плагина нет настроек.",
    "View more info": "Подробнее",
    "View source code": "Исходный код",
    "Authors": "Авторы",

    // Themes tab
    "Local Themes": "Локальные темы",
    "Online Themes": "Онлайн-темы",
    "Theme Performance": "Производительность тем",
    "Find Themes:": "Где найти темы:",
    "BetterDiscord theme list": "Каталог тем BetterDiscord",
    "External Resources": "Внешние ресурсы",
    "For security reasons, loading resources (styles, fonts, images, ...) from most sites is blocked.": "В целях безопасности загрузка ресурсов (стилей, шрифтов, картинок...) с большинства сайтов заблокирована.",
    "Make sure all your assets are hosted on GitHub, GitLab, Codeberg, Imgur, Discord or Google Fonts.": "Храните ресурсы темы на GitHub, GitLab, Codeberg, Imgur, Discord или Google Fonts.",
    "Upload Theme": "Загрузить тему",
    "Open Themes Folder": "Открыть папку тем",
    "Load missing Themes": "Подгрузить недостающие темы",
    "Edit ClientTheme": "Настроить ClientTheme",
    "Paste links to css files here": "Вставьте ссылки на CSS-файлы",
    "One link per line": "По одной ссылке в строке",
    "You can prefix lines with @light or @dark to toggle them based on your Discord theme": "Добавьте в начало строки @light или @dark, чтобы тема включалась только со светлой или тёмной темой Discord",
    "Make sure to use direct links to files (raw or github.io)!": "Нужны прямые ссылки на файлы (raw или github.io)!",
    "Enter Theme Links...": "Ссылки на темы...",

    // Updater
    "Hint: You can change the position of this settings section in the": "Подсказка: расположение этого раздела можно изменить в",
    "Themes and custom CSS have the potential to cause major lag! If you experience performance issues, try disabling your themes and CSS to see if they're the cause. The most common cause of lag is the":
        "Темы и свой CSS могут сильно тормозить Discord! Если заметили лаги, отключите темы и CSS и проверьте, не в них ли дело. Чаще всего тормоза вызывает оператор",
    "operator.": "",
    "If using the BD site, click on \"Download\" and place the downloaded .theme.css file into your themes folder.":
        "На сайте BetterDiscord нажмите «Download» и положите скачанный файл .theme.css в папку тем.",
    "This section is for advanced users. If you are having difficulties using it, use the Local Themes tab instead.":
        "Этот раздел для опытных пользователей. Если что-то непонятно, используйте вкладку «Локальные темы».",
    "Up to Date!": "Установлена последняя версия!",
    "Automatically update": "Обновлять автоматически",
    "Automatically update Nightcord without confirmation prompt": "Обновлять Nightcord без подтверждения",
    "Get notified when an automatic update completes": "Уведомлять после автообновления",
    "Show a notification when Nightcord automatically updates": "Показывать уведомление, когда Nightcord обновился сам",
    "Repo": "Репозиторий",
    "Updates": "Обновления",
    "Your local copy has more recent commits. Please stash or reset them.": "В локальной копии есть более новые коммиты. Спрячьте (stash) или сбросьте их.",
    "Failed to check updates. Check the console for more info": "Не удалось проверить обновления. Подробности в консоли",
    "Update Success!": "Обновлено!",
    "Successfully updated. Restart now to apply the changes?": "Обновление установлено. Перезапустить сейчас, чтобы применить?",
    "Not now!": "Не сейчас",
    "Update Now": "Обновить",
    "Check for Updates": "Проверить обновления",

    // Backup & Cloud
    "Warning": "Внимание",
    "Importing a settings file will overwrite your current settings.": "Импорт файла настроек заменит ваши текущие настройки.",
    "You can import and export your Nightcord settings as a JSON file.": "Настройки Nightcord можно сохранить в JSON-файл и загрузить обратно.",
    "Settings Export contains:": "В экспорт входят:",
    "Import Settings": "Импорт настроек",
    "Export Settings": "Экспорт настроек",
    "Cloud Integrations": "Облачные функции",
    "Enable Cloud Integrations": "Включить облачные функции",
    "This will request authorization if you have not yet set up cloud integrations.": "Если облако ещё не настроено, появится запрос авторизации.",
    "Backend URL": "Адрес сервера",
    "Which backend to use when using cloud integrations.": "Какой сервер использовать для облачных функций.",
    "Reauthorise": "Авторизоваться заново",
    "Settings Sync": "Синхронизация настроек",
    "Enable Settings Sync": "Включить синхронизацию настроек",
    "Save your Nightcord settings to the cloud so you can easily keep them the same on all your devices": "Хранить настройки Nightcord в облаке, чтобы они совпадали на всех устройствах",
    "Sync Rules for This Device": "Правила синхронизации для этого устройства",
    "Two-way sync (changes go both directions)": "Двусторонняя (изменения идут в обе стороны)",
    "This device is the source (upload only)": "Главное — это устройство (только выгрузка)",
    "The cloud is the source (download only)": "Главное — облако (только загрузка)",
    "Do not sync automatically (manual sync via buttons below only)": "Не синхронизировать автоматически (только кнопками ниже)",
    "Upload Settings": "Выгрузить настройки",
    "This will replace your current settings with the ones saved in the cloud. Be careful!": "Текущие настройки будут заменены сохранёнными в облаке. Осторожно!",
    "Download Settings": "Загрузить настройки",
    "Reset Cloud Data": "Сброс облачных данных",
    "Delete Settings from Cloud": "Удалить настройки из облака",
    "Are you sure?": "Вы уверены?",
    "Once your data is erased, we cannot recover it. There's no going back!": "Удалённые данные не восстановить. Пути назад не будет!",
    "Erase it!": "Удалить",
    "Nevermind": "Отмена",
    "Delete your Cloud Account": "Удалить облачный аккаунт",
};

/** Translate a Nightcord UI string when the RussianNightcord plugin is enabled. */
export function t(text: string): string {
    if (!Settings.plugins?.RussianNightcord?.enabled) return text;
    return RU[text] ?? text;
}

/** "There are N Updates" with correct Russian plurals */
export function tUpdates(n: number): string {
    if (!Settings.plugins?.RussianNightcord?.enabled) return n === 1 ? "There is 1 Update" : `There are ${n} Updates`;
    const m10 = n % 10, m100 = n % 100;
    const word = m10 === 1 && m100 !== 11 ? "обновление" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "обновления" : "обновлений";
    return `Доступно ${n} ${word}`;
}

export const translatedStrings = Object.keys(RU);
