/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

import { PLUGIN_DESCRIPTIONS_RU } from "./pluginDescriptionsRu";
import { PLUGIN_SETTINGS_RU } from "./pluginSettingsRu";

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

    // Plugin curation
    "Show Curated":
        "Проверенные",
    "Show Experimental":
        "Экспериментальные 🧪",
    "Show Developer Tools":
        "Для разработчиков 🛠️",
    "Experimental: from Equicord's wider collection, may be unstable or look rough":
        "Экспериментальный: из расширенной коллекции Equicord, может работать нестабильно или выглядеть сыро",
    "Developer tool":
        "Инструмент разработчика",

    // Plugin presets
    "Big files without Nitro":
        "Большие файлы без Nitro",
    "Files over Discord's upload limit are uploaded to Litterbox (up to 1 GB, kept for 72 hours) and the link is put in your message. Smaller files still go to Discord.":
        "Файлы больше лимита Discord загружаются на Litterbox (до 1 ГБ, хранятся 72 часа), а ссылка вставляется в сообщение. Файлы поменьше по-прежнему идут в Discord.",
    "Only files over the limit leave Discord. They go to litterbox.catbox.moe, a free public file host: anyone with the link can open the file until it expires after 72 hours. Do not send private files this way.":
        "Из Discord уходят только файлы больше лимита. Они загружаются на litterbox.catbox.moe — бесплатный публичный файлообменник: любой, у кого есть ссылка, может открыть файл, пока он не удалится через 72 часа. Не отправляйте так личные файлы.",
    "Will change settings":
        "Изменятся настройки",
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
    "Show All": "Все плагины",
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

    // Plugin setting inputs
    "Select an option": "Выберите вариант",
    "Enter a number": "Введите число",
    "Enter a value": "Введите значение",
    "Invalid input provided": "Недопустимое значение",

    // Custom plugin settings panels (FileUpload, MusicControls)
    "Fallback Order": "Порядок запасных хостингов",
    "Drag hosts to reorder fallback attempts. The selected host is tried first, then this order is used.": "Перетаскивайте хостинги, чтобы задать порядок. Сначала пробуется выбранный, затем по этому списку.",
    "Upload Service": "Хостинг",
    "Choose where FileUpload sends new files.": "Куда загружать файлы.",
    "Connection details for your Zipline instance.": "Подключение к вашему серверу Zipline.",
    "Service URL": "Адрес сервиса",
    "The URL of your Zipline instance": "Адрес вашего сервера Zipline",
    "Zipline Token": "Токен Zipline",
    "Your Zipline API authorization token": "Ваш API-токен Zipline",
    "Folder ID": "ID папки",
    "Folder ID for uploads (leave empty for no folder)": "ID папки для загрузок (пусто — без папки)",
    "Connection details for E-Z Host uploads.": "Подключение к E-Z Host.",
    "E-Z Host API Key": "API-ключ E-Z Host",
    "Your E-Z Host API key": "Ваш API-ключ E-Z Host",
    "Connection details for Nest uploads.": "Подключение к Nest.",
    "Nest Token": "Токен Nest",
    "Your Nest API authorization token": "Ваш API-токен Nest",
    "Connection details for Encrypting.host uploads.": "Подключение к Encrypting.host.",
    "Encrypting.host API Key": "API-ключ Encrypting.host",
    "Your Encrypting.host API key": "Ваш API-ключ Encrypting.host",
    "URL Style": "Вид ссылок",
    "How Encrypting.host should format returned links.": "Как Encrypting.host оформляет ссылки.",
    "Domains JSON": "Домены (JSON)",
    "JSON array of domains to use, for example [\"offensive\"].": "JSON-массив доменов, например [\"offensive\"].",
    "Embed Title": "Заголовок превью",
    "Optional title for embed style responses.": "Заголовок для превью (необязательно).",
    "Embed Color": "Цвет превью",
    "Optional color for embed style responses.": "Цвет для превью (необязательно).",
    "Fake Link": "Фейковая ссылка",
    "Optional fake link value for fakelink style responses.": "Текст фейковой ссылки для вида «fakelink» (необязательно).",
    "S3-Compatible Storage": "S3-совместимое хранилище",
    "Connection details and object naming for your bucket.": "Подключение и имена файлов в вашем бакете.",
    "S3 Endpoint URL": "Адрес S3",
    "S3-compatible endpoint (e.g. https://<accountid>.r2.cloudflarestorage.com)": "S3-совместимый адрес (например https://<accountid>.r2.cloudflarestorage.com)",
    "Bucket Name": "Бакет",
    "Bucket to upload into": "Куда загружать",
    "Region": "Регион",
    "AWS region or auto for Cloudflare R2": "Регион AWS или auto для Cloudflare R2",
    "Access Key ID": "ID ключа доступа",
    "S3-compatible access key": "Ключ доступа S3",
    "Secret Access Key": "Секретный ключ",
    "S3-compatible secret key": "Секретный ключ S3",
    "Session Token": "Токен сессии",
    "Optional temporary credential token": "Временный токен (необязательно)",
    "Public Base URL": "Публичный адрес",
    "Optional public URL base to use for returned links": "Начало публичных ссылок (необязательно)",
    "Object Key Prefix": "Префикс файлов",
    "Optional folder/prefix inside the bucket": "Папка или префикс внутри бакета (необязательно)",
    "Use Path-Style Endpoint": "Адреса вида endpoint/bucket/key",
    "Use endpoint/bucket/key format, recommended for R2.": "Формат endpoint/bucket/key, рекомендуется для R2.",
    "Optional account binding for Catbox uploads.": "Привязка к аккаунту Catbox (необязательно).",
    "Catbox Userhash": "Userhash Catbox",
    "Your Catbox userhash for account binding, leave empty for anonymous uploads.": "Ваш userhash Catbox для привязки к аккаунту. Пусто — анонимно.",
    "Litterbox Expiry": "Срок хранения Litterbox",
    "How long uploads are retained": "Сколько хранятся файлы",
    "Optional account binding for GoFile uploads.": "Привязка к аккаунту GoFile (необязательно).",
    "GoFile Token": "Токен GoFile",
    "Optional GoFile token to upload into your account.": "Токен GoFile, чтобы загружать в ваш аккаунт (необязательно).",
    "Connection details for PixelVault uploads.": "Подключение к PixelVault.",
    "PixelVault Upload Key": "Ключ загрузки PixelVault",
    "Your PixelVault authorization key.": "Ваш ключ авторизации PixelVault.",
    "Optional account binding for PixelDrain uploads.": "Привязка к аккаунту PixelDrain (необязательно).",
    "PixelDrain API Key": "API-ключ PixelDrain",
    "Optional PixelDrain API key for authenticated uploads. Leave empty for anonymous uploads.": "API-ключ PixelDrain для загрузки в аккаунт. Пусто — анонимно.",
    "ShareX Custom Uploader": "Свой загрузчик ShareX",
    "Paste, import, or validate a ShareX custom uploader config.": "Вставьте, импортируйте или проверьте конфиг загрузчика ShareX.",
    "ShareX Custom Uploader Config": "Конфиг загрузчика ShareX",
    "Paste your ShareX custom uploader JSON (.sxcu/.json). DestinationType must include FileUploader or ImageUploader.": "Вставьте JSON загрузчика ShareX (.sxcu/.json). В DestinationType должен быть FileUploader или ImageUploader.",
    "ShareX Config Actions": "Действия с конфигом ShareX",
    "Import from file or validate pasted config": "Импорт из файла или проверка вставленного конфига",
    "Connection details for WebDAV servers (Nextcloud, Owncloud, etc.).": "Подключение к WebDAV-серверу (Nextcloud, ownCloud и др.).",
    "Server URL": "Адрес сервера",
    "Base WebDAV URL (e.g. https://nextcloud.example.com/remote.php/dav/files/username)": "Адрес WebDAV (например https://nextcloud.example.com/remote.php/dav/files/username)",
    "Username": "Имя пользователя",
    "WebDAV username": "Имя пользователя WebDAV",
    "Password or App Token": "Пароль или токен приложения",
    "WebDAV password or app token": "Пароль WebDAV или токен приложения",
    "Upload Directory": "Папка загрузки",
    "Optional subdirectory on the server to upload into (e.g. uploads)": "Подпапка на сервере (например uploads, необязательно)",
    "Server Type": "Тип сервера",
    "Select your WebDAV server type. Nextcloud and ownCloud will create a public share link. Generic returns the raw file URL.": "Тип WebDAV-сервера. Nextcloud и ownCloud создают публичную ссылку, обычный WebDAV отдаёт прямой адрес файла.",
    "Share Link Format": "Формат ссылки",
    "How to return the public share link. Share Page links to a web page; Direct Download links straight to the file; Markdown Link wraps the share page in a clickable filename.": "Какую ссылку отдавать: на страницу, прямую на файл или Markdown-ссылку с именем файла.",
    "Upload Behavior": "После загрузки",
    "Control what FileUpload does after a host returns a URL.": "Что делать, когда хостинг вернул ссылку.",
    "Strip Query Parameters": "Убирать параметры из ссылки",
    "Strip query parameters from the uploaded file URL.": "Убирать ?параметры из ссылки на файл.",
    "Use Embed Proxy": "Прокси для превью",
    "Wrap uploaded video links with an embed proxy service for better Discord previews.": "Пропускать ссылки на видео через прокси, чтобы Discord лучше показывал превью.",
    "Embed Proxy Service": "Сервис прокси превью",
    "Choose which embed proxy service to use for uploaded video links": "Какой прокси использовать для ссылок на видео",
    "Convert APNG to GIF": "APNG в GIF",
    "Convert APNG files to GIF format.": "Конвертировать APNG в GIF.",
    "Preserve Original Filename": "Сохранять имя файла",
    "Use the original filename instead of naming uploads as upload.ext.": "Загружать с исходным именем, а не upload.ext.",
    "Auto Copy URL": "Копировать ссылку",
    "Automatically copy the uploaded file URL to clipboard.": "Сразу копировать ссылку на файл в буфер обмена.",
    "Disable Fallback Uploaders": "Без запасных хостингов",
    "Only use the selected uploader without trying fallback hosts.": "Использовать только выбранный хостинг, не пробовать запасные.",
    "Insert URL into Chat Input": "Вставлять ссылку в поле ввода",
    "After upload, insert the resulting URL into the current chat input.": "После загрузки вставлять ссылку в поле ввода.",
    "Format Inserted URL": "Ссылка без превью",
    "Wrap inserted URLs in angle brackets to avoid Discord preview embedding.": "Оборачивать ссылку в <угловые скобки>, чтобы Discord не делал превью.",
    "Discord Integration": "Работа с Discord",
    "Choose when FileUpload takes over Discord file handling.": "Когда FileUpload берёт загрузку файлов на себя.",
    "Bypass Discord Upload Button": "Вместо загрузки Discord",
    "Use FileUpload when uploading through Discord's file picker.": "Загружать через FileUpload файлы, выбранные кнопкой Discord.",
    "Auto Upload Pasted Files": "Загружать вставленное",
    "Automatically upload files from clipboard to image host when pasting in chat input.": "Файлы из буфера обмена при вставке в поле ввода сразу загружать на хостинг.",
    "Respect Discord File Size Limit": "Только сверх лимита Discord",
    "Use FileUpload only for files larger than your current Discord upload limit.": "Использовать FileUpload только для файлов больше вашего лимита Discord.",
    "Allowed File Types": "Типы файлов",
    "Comma-separated list of extensions (e.g. png,jpg,gif). Leave empty to allow all.": "Расширения через запятую (например png,jpg,gif). Пусто — все.",
    "Network": "Сеть",
    "Configure browser upload proxying and timeouts.": "Прокси для загрузки из браузера и таймауты.",
    "CORS Proxy URL": "Адрес CORS-прокси",
    "CORS proxy used for web uploads. Leave empty to use the default proxy.": "CORS-прокси для загрузки в браузерной версии. Пусто — стандартный.",
    "Default CORS Proxy Source": "Исходники стандартного прокси",
    "Source code for the default CORS proxy": "Исходный код стандартного CORS-прокси",
    "Upload Timeout": "Таймаут загрузки",
    "Maximum time to wait per upload attempt before switching to fallback": "Сколько ждать загрузку, прежде чем пробовать запасной хостинг",
    "Lyrics Provider": "Источник текстов",
    "Where lyrics are fetched from.": "Откуда брать тексты песен.",
    "Spotify Lyrics API Base URL": "Адрес API текстов Spotify",
    "Custom instance base URL (for example: http://localhost:8080).": "Адрес своего сервера (например http://localhost:8080).",

    "NEW": "НОВОЕ",

    // Plugin menus, toasts, notifications and chat bar buttons (via @api/UiTranslation)
    "Add Attachments": "Добавить вложения",
    "Add Bookmark to Folder": "Добавить закладку в папку",
    "Add Category": "Добавить категорию",
    "All": "Все",
    "All scheduled messages cleared": "Все запланированные сообщения удалены",
    "APNG to GIF conversion failed, uploading as APNG": "Не удалось перевести APNG в GIF, загружаю как APNG",
    "Apply NewGuildSettings": "Применить NewGuildSettings",
    "Apply NewGuildSettings to Folder": "Применить NewGuildSettings к папке",
    "Attempting to recover...": "Пробую восстановить…",
    "Authorization successful!": "Авторизация прошла успешно!",
    "AutoComplete is broken. A fix will be implemented shortly.": "Автовыполнение сломано. Исправление скоро будет.",
    "Awn :( Discord has crashed two times rapidly, not attempting to recover.": "Эх :( Discord упал два раза подряд, больше не пробую восстановить.",
    "Bookmark Bar": "Панель закладок",
    "Chat Bar Indicators": "Индикаторы над полем ввода",
    "Chat Icon": "Кнопка в поле ввода",
    "Choose File...": "Выбрать файл…",
    "Clear Message Log": "Очистить журнал сообщений",
    "Clear Quest Queue": "Очистить очередь заданий",
    "Close Other Tabs": "Закрыть другие вкладки",
    "Close Tab": "Закрыть вкладку",
    "Close Tabs to the Left": "Закрыть вкладки слева",
    "Close Tabs to the Right": "Закрыть вкладки справа",
    "Command deleted.": "Команда удалена.",
    "Copy Channel ID": "Копировать ID канала",
    "Copy current lyric": "Копировать текущую строку",
    "Copy Decoration Hash": "Копировать хэш украшения",
    "Copy Emoji Markdown": "Копировать эмодзи как Markdown",
    "Copy Message ID": "Копировать ID сообщения",
    "Copy Quest ID": "Копировать ID задания",
    "Copy Role Color": "Копировать цвет роли",
    "Copy Server ID": "Копировать ID сервера",
    "Copy Sticker Link": "Копировать ссылку на стикер",
    "Copy User URL": "Копировать ссылку на профиль",
    "CustomRPC application ID is already added.": "ID приложения CustomRPC уже добавлен.",
    "CustomRPC application ID is not set.": "ID приложения CustomRPC не задан.",
    "Deafen all": "Отключить звук всем",
    "DeepL API key is not set. Resetting to Google": "Ключ DeepL не задан. Переключаюсь на Google",
    "Deepl API quota exceeded. Falling back to Google Translate": "Лимит DeepL исчерпан. Перевожу через Google",
    "Default Hidden": "Скрывать по умолчанию",
    "Delete Bookmark": "Удалить закладку",
    "Delete Category": "Удалить категорию",
    "Delete Decoration": "Удалить украшение",
    "Delete Log": "Удалить запись",
    "Delete Message (Hide From Message Loggers)": "Удалить (скрыть от логгеров)",
    "Delete Preset": "Удалить пресет",
    "Disconnect all": "Отключить всех",
    "Discord has crashed!": "Discord упал!",
    "Edit Bookmark": "Изменить закладку",
    "Edit Category": "Изменить категорию",
    "Edit Role": "Изменить роль",
    "Enable Activity": "Включить активность",
    "Enable Game Activity": "Показывать игровую активность",
    "Example Notification": "Пример уведомления",
    "Exit idle": "Выйти из режима «Неактивен»",
    "Failed to connect to arRPC, is it running?": "Не удалось подключиться к arRPC. Он запущен?",
    "Failed to finish recording": "Не удалось завершить запись",
    "Failed to load saved tabs": "Не удалось загрузить сохранённые вкладки",
    "Failed to refresh timezones.": "Не удалось обновить часовые пояса.",
    "Failed to reset database timezone": "Не удалось сбросить часовой пояс в базе",
    "Failed to restore tabs": "Не удалось восстановить вкладки",
    "Failed to send scheduled message": "Не удалось отправить запланированное сообщение",
    "Failed to start recording": "Не удалось начать запись",
    "Failed to upload voice message": "Не удалось загрузить голосовое сообщение",
    "Fetch Quests": "Загрузить задания",
    "File type not allowed by current filter": "Этот тип файла запрещён фильтром",
    "Imported ShareX config": "Конфиг ShareX импортирован",
    "Insert Timestamp": "Вставить метку времени",
    "Join": "Зайти",
    "Jump To First Message": "К первому сообщению",
    "Jump To Last Message": "К последнему сообщению",
    "Jump To Message": "Перейти к сообщению",
    "Lens Size": "Размер лупы",
    "Lyrics cache purged": "Кэш текстов очищен",
    "Mark All Ignored": "Игнорировать все",
    "Mark as Ignored": "Игнорировать",
    "Members List Indicators": "Индикаторы в списке участников",
    "Mention all Users": "Упомянуть всех",
    "Message Logger": "Журнал сообщений",
    "Message scheduled!": "Сообщение запланировано!",
    "Move all": "Переместить всех",
    "Move Down": "Ниже",
    "Move Up": "Выше",
    "Mute all": "Заглушить всех",
    "Nearest Neighbour": "Без сглаживания",
    "Network error: Failed to connect to ReviewDB.": "Ошибка сети: не удалось подключиться к ReviewDB.",
    "No settings page was provided.": "У этого нет страницы настроек.",
    "Not restoring tabs as KeepCurrentChannel is enabled": "Вкладки не восстановлены: включён KeepCurrentChannel",
    "Now sending voice message... Please be patient": "Отправляю голосовое сообщение… Подождите немного",
    "OK": "ОК",
    "Open Album": "Открыть альбом",
    "Open All Bookmarks": "Открыть все закладки",
    "Open in New Tab": "Открыть в новой вкладке",
    "Open Logs": "Открыть журнал",
    "Open Sticker Link": "Открыть ссылку на стикер",
    "Open Translate Modal": "Открыть переводчик",
    "Open user profile": "Открыть профиль",
    "Opened link in native app": "Ссылка открыта в приложении",
    "Opening authorization window...": "Открываю окно авторизации…",
    "Permanently Ignore Calls": "Всегда игнорировать звонки",
    "Pin DMs": "Закрепить ЛС",
    "Please authorize to add a review.": "Авторизуйтесь, чтобы оставить отзыв.",
    "Please authorize to vote on reviews.": "Авторизуйтесь, чтобы голосовать за отзывы.",
    "Please configure FileUpload settings first": "Сначала настройте FileUpload",
    "Preview Message": "Предпросмотр сообщения",
    "Prioritize Server Profile": "Сначала профиль сервера",
    "Quest Completed!": "Задание выполнено!",
    "Queue All Quests": "Все задания в очередь",
    "Remove from Folder": "Убрать из папки",
    "Reopen Closed Tab": "Открыть закрытую вкладку",
    "Reset Ignored List": "Сбросить список игнорируемых",
    "Retry": "Повторить",
    "Scheduled message removed": "Запланированное сообщение удалено",
    "Search Image": "Искать картинку",
    "Search Text": "Искать текст",
    "Send Greets": "Отправить приветствие",
    "Send Voice Message": "Отправить голосовое сообщение",
    "Server Info": "О сервере",
    "Set Color": "Задать цвет",
    "Set Local Timezone": "Задать часовой пояс",
    "ShareX config is valid": "Конфиг ShareX в порядке",
    "Silent Typing": "Скрытый набор текста",
    "Square Lens": "Квадратная лупа",
    "Start Auto-Complete": "Начать автовыполнение",
    "Stop Auto-Complete": "Остановить автовыполнение",
    "Successfully logged in!": "Вход выполнен!",
    "Tag": "Метка",
    "Temporarily Ignore Calls": "Временно игнорировать звонки",
    "This is an example toast notification!": "Это пример всплывающего уведомления!",
    "Timezone deleted successfully!": "Часовой пояс удалён!",
    "Timezone updated successfully!": "Часовой пояс обновлён!",
    "Timezones Failed to refresh!": "Не удалось обновить часовые пояса!",
    "Timezones refreshed successfully!": "Часовые пояса обновлены!",
    "Toggle Deleted Highlight": "Подсветка удалённых",
    "Translations cleared": "Переводы очищены",
    "Undeafen all": "Включить звук всем",
    "Unholy Multi-Greet": "Мультиприветствие",
    "Unmark as Ignored": "Не игнорировать",
    "Unmute all": "Снять заглушение со всех",
    "Unpin DM": "Открепить ЛС",
    "Upload already in progress": "Загрузка уже идёт",
    "Upload cancelled": "Загрузка отменена",
    "Upload successful": "Загружено",
    "Upload successful, but failed to copy URL": "Загружено, но не удалось скопировать ссылку",
    "Upload successful, but no URL was available to copy": "Загружено, но ссылки для копирования нет",
    "Upload successful, URL copied to clipboard": "Загружено, ссылка скопирована",
    "Upload to Host": "Загрузить на хостинг",
    "Uploading, this can take a while...": "Загружаю, это может занять время…",
    "View Album Cover": "Показать обложку",
    "View Avatar": "Показать аватар",
    "View Avatar Decoration": "Показать украшение аватара",
    "View Banner": "Показать баннер",
    "View Icon": "Показать значок",
    "View Members in Role": "Участники с этой ролью",
    "View Permissions": "Показать права",
    "View Reviews": "Показать отзывы",
    "View Role Icon": "Показать значок роли",
    "View Role Members": "Участники с ролью",
    "View Server Avatar": "Показать аватар на сервере",
    "View Stream Preview": "Показать превью стрима",
    "Voice Tools": "Голосовые инструменты",
    "Volume": "Громкость",
    "Wait": "Подождать",
    "You cannot add more attachments to this message.": "К этому сообщению больше нельзя добавить вложения.",
    "You cannot join the user's Voice Channel": "Нельзя зайти в голосовой канал этого пользователя",
    "You cannot vote on your own review.": "Нельзя голосовать за свой отзыв.",
    "You have new reviews on your profile!": "У вас новые отзывы в профиле!",
    "You must be logged in to block users.": "Войдите, чтобы блокировать пользователей.",
    "You must be logged in to delete reviews.": "Войдите, чтобы удалять отзывы.",
    "You must be logged in to report reviews.": "Войдите, чтобы жаловаться на отзывы.",
    "Zoom": "Увеличение",
    "Zoom Speed": "Скорость увеличения",

    // Plugin tags
    "Accessibility": "Доступность",
    "Activity": "Активность",
    "Appearance": "Внешний вид",
    "Chat": "Чат",
    "Commands": "Команды",
    "Console": "Консоль",
    "Customisation": "Кастомизация",
    "Developers": "Разработчикам",
    "Emotes": "Эмодзи",
    "Friends": "Друзья",
    "Fun": "Развлечения",
    "Media": "Медиа",
    "Organisation": "Организация",
    "Reactions": "Реакции",
    "Roles": "Роли",
    "Servers": "Серверы",
    "Shortcuts": "Горячие клавиши",
    "Utility": "Полезное",
    "Voice": "Голос",
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

const localizedSettings = new WeakMap<object, any>();

/**
 * Russian title, description and option labels for a plugin setting, if it has a translation.
 * Title and description are only replaced while the English description matches the translated one;
 * option labels are matched by their English text.
 */
export function tPluginSetting<T extends object>(pluginName: string, key: string, setting: T): T {
    if (!Settings.plugins?.RussianNightcord?.enabled) return setting;
    const entry = PLUGIN_SETTINGS_RU[pluginName]?.[key];
    if (!entry) return setting;

    let localized = localizedSettings.get(setting);
    if (localized) return localized;

    const [hash, title, description, options] = entry;
    const def = setting as { description?: string; options?: { label?: unknown; }[]; };
    localized = { ...setting };
    if (hash === hashDescription(def.description ?? "")) {
        localized.displayName = title;
        localized.description = description;
    }
    if (options && Array.isArray(def.options)) {
        localized.options = def.options.map(o => typeof o?.label === "string" && options[o.label] ? { ...o, label: options[o.label] } : o);
    }
    localizedSettings.set(setting, localized);
    return localized;
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
