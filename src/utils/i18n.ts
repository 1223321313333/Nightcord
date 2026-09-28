/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

import { PLUGIN_DESCRIPTIONS_RU } from "./pluginDescriptionsRu";

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

    // Equicord settings, part 2
    "Changelog":
        "Список изменений",
    "Clear All Logs":
        "Очистить все записи",
    "Clear All":
        "Очистить всё",
    "Cancel":
        "Отмена",
    "Clear Log":
        "Очистить запись",
    "Updated Plugins":
        "Обновлённые плагины",
    "New Settings":
        "Новые настройки",
    "Fetch Changes":
        "Проверить изменения",
    "Check the repository for new commits, plugin updates, and code changes. This will compare your current version with the latest available and show you what's new.":
        "Проверить репозиторий на новые коммиты и обновления плагинов. Текущая версия сравнится с последней, и вы увидите, что нового.",
    "Make sure you have an internet connection and try again.":
        "Проверьте подключение к интернету и попробуйте снова.",
    "This is the GitHub repository where Nightcord fetches updates from.":
        "Из этого репозитория на GitHub Nightcord получает обновления.",
    "Recent Changes":
        "Последние изменения",
    "These are the new commits and plugin updates since your last version. You can see what features were added, bugs were fixed, and which plugins received updates.":
        "Новые коммиты и обновления плагинов с прошлой версии: что добавили, что исправили и какие плагины обновились.",
    "No commits available ahead of your current version. Click \"Fetch from Repository\" to check for new changes.":
        "Новых коммитов нет. Нажмите «Проверить изменения», чтобы поискать обновления.",
    "A history of your previous update sessions with their commit history and plugin changes. Click on a log to expand it and see the details.":
        "История прошлых обновлений с коммитами и изменениями плагинов. Нажмите на запись, чтобы раскрыть подробности.",
    "The following plugins have been added in recent updates:":
        "В последних обновлениях добавлены плагины:",
    "Disable the Main Window Frame":
        "Убрать рамку главного окна",
    "Remove the native window frame for a cleaner look. You can still move the window by dragging the title bar area.":
        "Убрать системную рамку окна. Перемещать окно можно, потянув за область заголовка.",
    "Disable All Window Frames":
        "Убрать рамки всех окон",
    "Replace Discord's custom title bar with the standard Windows title bar. This may improve compatibility with some window management tools.":
        "Использовать стандартный заголовок Windows вместо заголовка Discord. Может улучшить совместимость с программами для управления окнами.",
    "Enable Window Transparency":
        "Включить прозрачность окна",
    "Make the Discord window transparent. A theme that supports transparency is required or this will do nothing.":
        "Сделать окно Discord прозрачным. Нужна тема с поддержкой прозрачности, иначе ничего не изменится.",
    "Disable Minimum Window Size":
        "Убрать минимальный размер окна",
    "Register Ctrl+Q as shortcut to close Discord":
        "Закрывать Discord по Ctrl+Q",
    "Add Ctrl+Q as a keyboard shortcut to close Discord. This provides an alternative to Alt+F4 for quickly closing the application.":
        "Добавить сочетание Ctrl+Q для закрытия Discord, как альтернативу Alt+F4.",
    "MacOS Window vibrancy style (requires restart)":
        "Эффект вибрации окна macOS (нужен перезапуск)",
    "Window vibrancy style":
        "Эффект вибрации окна",
    "No vibrancy":
        "Без эффекта",
    "Mica (incorporates system theme + desktop wallpaper to paint the background)":
        "Mica (фон из системной темы и обоев рабочего стола)",
    "Tabbed (variant of Mica with stronger background tinting)":
        "Tabbed (Mica с более сильным оттенком фона)",
    "Acrylic (blurs the window behind Vesktop for a translucent background)":
        "Acrylic (размывает окно позади, фон полупрозрачный)",
    "Windows transparent background effects. You need a theme that supports transparency or this will do nothing. A restart is required after changing this setting.":
        "Эффекты прозрачного фона Windows. Нужна тема с поддержкой прозрачности, иначе ничего не изменится. После изменения нужен перезапуск.",
    "Some plugins may show you notifications. These come in two styles:":
        "Некоторые плагины показывают уведомления. Они бывают двух видов:",
    "Nightcord Notifications":
        "Уведомления Nightcord",
    ": These are in-app notifications":
        ": уведомления внутри приложения",
    "Desktop Notifications":
        "Системные уведомления",
    ": Native Desktop notifications (like when you get a ping)":
        ": уведомления Windows (как при упоминании)",
    "Missed Notification Count":
        "Счётчик пропущенных уведомлений",
    "When refocusing discord a notification will popup with how you missed":
        "Когда вы вернётесь в Discord, появится уведомление о том, сколько вы пропустили",
    "The amount of notifications to save in the log until old ones are removed. Set to":
        "Сколько уведомлений хранить в журнале, прежде чем удалять старые.",
    "to disable Notification log and":
        "— отключить журнал,",
    "to never automatically remove old Notifications":
        "— никогда не удалять старые уведомления автоматически",
    "Restart Now":
        "Перезапустить сейчас",
    "Later":
        "Позже",
    "Disable All Plugins":
        "Выключить все плагины",
    "Some plugins require a restart to fully disable.":
        "Некоторые плагины полностью выключаются только после перезапуска.",
    "Would you like to restart now?":
        "Перезапустить сейчас?",
    "Nightcord Plugin":
        "Плагин Nightcord",
    "Modified Vencord Plugin":
        "Изменённый плагин Vencord",
    "Equicord Plugin":
        "Плагин Equicord",
    "Vencord Plugin":
        "Плагин Vencord",
    "User Plugin":
        "Пользовательский плагин",
    "Reset to default settings":
        "Сбросить настройки",
    "Website":
        "Сайт",
    "Source Code":
        "Исходный код",
    "Are you sure you want to reset all settings for":
        "Сбросить все настройки плагина",
    "to their default values?":
        "к значениям по умолчанию?",
    "This action cannot be undone.":
        "Это действие нельзя отменить.",
    "Reset":
        "Сбросить",
    "Enabled Plugins":
        "Включено плагинов",
    "Total Plugins":
        "Всего плагинов",
    "Total Userplugins":
        "Пользовательских плагинов",
    "Enabled Userplugins":
        "Включено пользовательских",
    "Import and export your Nightcord settings as a JSON file. This allows you to easily transfer your settings to another device, or recover them after reinstalling Nightcord or Discord.":
        "Сохраните настройки Nightcord в JSON-файл и загрузите обратно: чтобы перенести их на другое устройство или восстановить после переустановки.",
    "Importing a settings file will overwrite your current settings. Make sure to export a backup first if you want to keep your current configuration.":
        "Импорт заменит текущие настройки. Если хотите их сохранить, сначала сделайте экспорт.",
    "What's included in a backup":
        "Что входит в резервную копию",
    "• Custom QuickCSS":
        "• Свой QuickCSS",
    "• Theme Links":
        "• Ссылки на темы",
    "• Plugin Settings":
        "• Настройки плагинов",
    "• DataStore Data":
        "• Данные плагинов (DataStore)",
    "Select a previously exported settings file to restore your configuration. This will replace all your current settings with the ones from the backup.":
        "Выберите ранее сохранённый файл настроек. Все текущие настройки заменятся настройками из копии.",
    "Import All Settings":
        "Импортировать всё",
    "Import Plugins":
        "Импорт плагинов",
    "Import QuickCSS":
        "Импорт QuickCSS",
    "Import DataStore":
        "Импорт DataStore",
    "Download your current settings as a backup file. You can export everything at once, or choose to export only specific parts of your configuration.":
        "Скачайте текущие настройки файлом. Можно сохранить всё сразу или только отдельные части.",
    "Export All Settings":
        "Экспортировать всё",
    "Export Plugins":
        "Экспорт плагинов",
    "Export QuickCSS":
        "Экспорт QuickCSS",
    "Export DataStore":
        "Экспорт DataStore",
    "Cloud Integration":
        "Облако",
    "Cloud integration syncs your settings across multiple devices and Discord installations.":
        "Облако синхронизирует ваши настройки между устройствами и установками Discord.",
    "Nightcord has no servers of its own. By default it uses Equicord's":
        "У Nightcord нет своих серверов. По умолчанию используется",
    "backend, run by the Equicord team. Read their":
        "— сервер команды Equicord. Прочитайте их",
    "privacy policy":
        "политику конфиденциальности",
    "to see what is stored. Equicloud is BSD 3.0 licensed, so you can self-host it instead.":
        ", чтобы узнать, что хранится. Equicloud распространяется по лицензии BSD 3.0, его можно поднять у себя.",
    "Enable Cloud Integration":
        "Включить облако",
    "Connect to the cloud backend for settings synchronization. This will request authorization if you haven't set up cloud integration yet.":
        "Подключиться к облаку для синхронизации настроек. Если облако ещё не настроено, появится запрос авторизации.",
    "When enabled, your settings can be synced to and from the cloud. Use the actions below to manually sync.":
        "Когда включено, настройки можно синхронизировать с облаком. Для ручной синхронизации используйте кнопки ниже.",
    "Delete Cloud Account":
        "Удалить облачный аккаунт",
    "Delete Account":
        "Удалить аккаунт",
    "Cloud Backend":
        "Облачный сервер",
    "Choose which cloud backend to use for storing your settings. You can switch between Equicord's and Vencord's cloud services, or use a self-hosted instance.":
        "Где хранить настройки: облако Equicord, облако Vencord или ваш собственный сервер.",
    "Synchronize your Nightcord settings to the cloud. This makes it easy to keep your configuration consistent across multiple devices without manual import/export.":
        "Синхронизация настроек Nightcord через облако, чтобы на всех устройствах было одинаково без ручного импорта и экспорта.",
    "This setting controls how settings move between":
        "Как настройки перемещаются между",
    "this device":
        "этим устройством",
    "and the cloud. You can let changes flow both ways, or choose one place to be the main source of truth.":
        "и облаком: в обе стороны или только из одного главного места.",
    "Sync to Cloud":
        "Отправить в облако",
    "Sync from Cloud":
        "Загрузить из облака",
    "Enable cloud integration above to use settings sync features.":
        "Чтобы синхронизировать настройки, включите облако выше.",
    "Danger Zone":
        "Опасная зона",
    "Permanently delete all your data from the cloud. This action cannot be undone and will remove all synced settings and any other data stored on the cloud backend.":
        "Навсегда удалить все ваши данные из облака. Это нельзя отменить: пропадут все синхронизированные настройки и другие данные на сервере.",
    "Delete Cloud Settings":
        "Удалить настройки из облака",
    "Reauthorize":
        "Авторизоваться заново",
    "Search for a theme...":
        "Поиск темы...",
    "Enabled":
        "Включены",
    "Disabled":
        "Выключены",
    "Theme Management":
        "Управление темами",
    "Customize Discord's appearance with themes. Add local .css files or load themes directly from URLs. Themes with a cog wheel icon have customizable settings you can modify.":
        "Меняйте внешний вид Discord темами: локальными .css-файлами или по ссылке. У тем с шестерёнкой есть свои настройки.",
    "Shortcuts for managing your themes. Open your themes folder to add new themes, use QuickCSS for quick style tweaks, or reload themes after making changes.":
        "Быстрые действия: открыть папку тем, подправить стили в QuickCSS или перезагрузить темы после изменений.",
    "Installed Themes":
        "Установленные темы",
    "Manage your themes here. Local themes load from your themes folder, online themes from URLs. Themes with a cog wheel icon have customizable settings.":
        "Локальные темы грузятся из папки тем, онлайн-темы — по ссылкам. У тем с шестерёнкой есть свои настройки.",
    "Loading themes...":
        "Загружаю темы...",
    "Themes Not Supported":
        "Темы не поддерживаются",
    "Themes are not available on the Userscript version.":
        "В версии-юзерскрипте темы недоступны.",
    "You can install themes using the":
        "Темы можно поставить через",
    "Stylus extension":
        "расширение Stylus",
    "Enable Online Themes":
        "Включить онлайн-темы",
    "Toggle online theme loading. When disabled, all online themes will be turned off and you won't be able to add new ones.":
        "Загружать темы по ссылкам. Если выключить, все онлайн-темы отключатся и добавить новые будет нельзя.",
    "Load themes directly from URLs instead of local files. Online themes auto-update when the source changes, so you always have the latest version without manual downloads.":
        "Темы по ссылке вместо локальных файлов. Они обновляются сами, когда автор меняет файл.",
    "Looking for themes? Check out":
        "Ищете темы? Загляните в",
    "BetterDiscord Themes":
        "каталог тем BetterDiscord",
    "or search on":
        "или поищите на",
    ". When downloading from BetterDiscord, click \"Download\" and place the .theme.css file into your themes folder.":
        ". На сайте BetterDiscord нажмите «Download» и положите файл .theme.css в папку тем.",
    "Theme activation":
        "Включение темы",
    "Open Website":
        "Открыть сайт",
    "Join Discord":
        "Сервер в Discord",
    "Copy URL":
        "Скопировать ссылку",
    "Download":
        "Скачать",
    "Open in Folder":
        "Показать в папке",
    "Refresh":
        "Обновить",
    "Delete":
        "Удалить",
    "Pinned":
        "Закреплена",
    "Always on":
        "Всегда",
    "Light only":
        "Только светлая",
    "Dark only":
        "Только тёмная",
    "Discord Server":
        "Сервер в Discord",
    "Your local copy has more recent commits than the remote repository. This usually happens when you've made local changes. Please stash or reset them before updating.":
        "В локальной копии есть коммиты новее, чем в репозитории. Обычно так бывает после локальных правок. Спрячьте (stash) или сбросьте их перед обновлением.",
    "Error checking for updates":
        "Ошибка при проверке обновлений",
    "You're running the latest version of Nightcord.":
        "У вас последняя версия Nightcord.",
    "When enabled, Nightcord will automatically download and install updates in the background without asking for confirmation. You'll need to restart Discord to apply the changes.":
        "Nightcord будет сам скачивать и ставить обновления в фоне, не спрашивая. Чтобы применить их, перезапустите Discord.",
    "Receive a notification when Nightcord finishes downloading an update in the background, so you know when to restart Discord.":
        "Уведомлять, когда Nightcord скачал обновление, чтобы вы знали, когда перезапустить Discord.",
    "Update Preferences":
        "Настройки обновлений",
    "Control how Nightcord keeps itself up to date. You can choose to update automatically in the background or be notified when new updates are available.":
        "Как Nightcord обновляется: автоматически в фоне или с уведомлением о новой версии.",
    "Oops!":
        "Ой!",
    "Where to put the Nightcord settings section":
        "Где показывать раздел настроек Nightcord",
    "At the very top":
        "В самом верху",
    "Above Billing section":
        "Над разделом оплаты",
    "Below Billing section":
        "Под разделом оплаты",
    "Above Games & Apps Settings":
        "Над настройками игр и приложений",
    "Below Games & Apps Settings":
        "Под настройками игр и приложений",
    "At the very bottom":
        "В самом низу",

    "Equicord Cloud": "Облако Equicord",
    "Vencord Cloud": "Облако Vencord",
    "Add": "Добавить",

    // Plugin presets
    "Plugin presets":
        "Наборы плагинов",
    "Set up many plugins in one click. You will see exactly what changes before anything happens.":
        "Настройка многих плагинов в один клик. Перед применением вы увидите, что именно изменится.",
    "Like my friends":
        "Как у друзей",
    "The popular set: emoji and stickers without Nitro, deleted messages, hidden channels, silent typing and handy tweaks.":
        "Популярный набор: эмодзи и стикеры без Nitro, удалённые сообщения, скрытые каналы, скрытое «печатает…» и полезные мелочи.",
    "Privacy":
        "Приватность",
    "Hide that you are typing, strip trackers from links, anonymise uploaded file names, no reply pings and streamer mode while streaming.":
        "Скрыть «печатает…», вырезать трекеры из ссылок, анонимные имена файлов, ответы без пинга и режим стримера во время стрима.",
    "Maximum speed":
        "Максимальная скорость",
    "Turns off plugins that add work to every message or member, and swaps heavy themes for the lightweight Nightcord theme.":
        "Выключает плагины, которые нагружают каждое сообщение и участника, и меняет тяжёлые темы на лёгкую тему Nightcord.",
    "Nightcord defaults":
        "Стандарт Nightcord",
    "Back to how Nightcord is set up after installing: the default plugins on, everything else off.":
        "Вернуть как после установки: стандартные плагины включены, остальные выключены.",
    "Apply":
        "Применить",
    "Everything from this preset is already set up.":
        "Всё из этого набора уже настроено.",
    "Could not change":
        "Не удалось изменить",
    "Preset applied!":
        "Набор применён!",
    "Will turn on":
        "Включится",
    "Will turn off":
        "Выключится",
    "Will turn off themes":
        "Выключатся темы",
    "You can change any of this later in the Plugins tab.":
        "Всё это потом можно поменять во вкладке «Плагины».",
    "Some of these plugins change Discord's code and start after a restart.":
        "Часть этих плагинов меняет код Discord и заработает после перезапуска.",

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

/** FNV-1a, must match scripts/nightcord/genDescriptions.cjs */
function hashDescription(str: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
}

/**
 * Russian plugin description, if there is one for exactly this English text.
 * When Equicord rewrites a description the hash stops matching and the new English text is shown
 * instead of an outdated translation.
 */
export function tPluginDescription(plugin: { name: string; description: string; }): string {
    if (!Settings.plugins?.RussianNightcord?.enabled) return plugin.description;
    const entry = PLUGIN_DESCRIPTIONS_RU[plugin.name];
    return entry && entry[0] === hashDescription(plugin.description) ? entry[1] : plugin.description;
}

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
